use crate::prelude::*;

pub struct Manhuascan {
    base: BaseModule,
}

#[async_trait]
impl Module for Manhuascan {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_webtoon_url(&self, manga: String) -> Result<String> {
        Ok(format!("https://manhuascan.us/manga/{manga}"))
    }
    async fn get_chapter_url(&self, manga: String, chapter: String) -> Result<String> {
        Ok(format!("https://manhuascan.us/manga/{manga}/{chapter}"))
    }
    async fn get_info(&self, manga: String) -> Result<ValueHashMap> {
        let url: String = format!("https://manhuascan.us/manga/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: ValueHashMap = HashMap::new();
        let mut extras: ValueHashMap = HashMap::new();
        let mut dates: ValueHashMap = HashMap::new();
        document
            .find(Name("img").and(Attr("class", "attachment- size- wp-post-image")))
            .next()
            .and_then(|element: Node| {
                element
                    .attr("src")
                    .and_then(|v: &str| insert!(info, "Cover", v))
            });
        document
            .find(Name("h1").and(Class("entry-title")))
            .next()
            .and_then(|element: Node| insert!(info, "Title", element.text().trim()));
        document
            .find(Name("span").and(Class("alternative")))
            .next()
            .and_then(|element: Node| {
                insert!(
                    info,
                    "Alternative",
                    element.text().trim().replace("Other Name: ", "")
                )
            });
        document
            .find(Name("div").and(Attr("class", "entry-content entry-content-single")))
            .next()
            .and_then(|element: Node| insert!(info, "Summary", element.text().trim()));
        document
            .find(
                Name("div")
                    .and(Class("detail_rate"))
                    .descendant(Name("span")),
            )
            .next()
            .and_then(|span: Node| {
                span.text()
                    .trim()
                    .replace("/5", "")
                    .parse::<f32>()
                    .ok()
                    .and_then(|v: f32| insert!(info, "Rating", v))
            });
        let Some(box_node) = document
            .find(Name("div").and(Attr("class", "tsinfo bixbox")))
            .next()
        else {
            return Ok(info);
        };
        box_node
            .children()
            .filter(|n: &Node| n.first_child().is_some())
            .for_each(|element: Node| {
                let key: String = element.first_child().unwrap().text().trim().to_string();
                if key.contains("Status") {
                    element
                        .find(Name("i"))
                        .next()
                        .and_then(|element: Node| insert!(info, key, element.text().trim()));
                    return;
                }
                element.find(Name("time")).next().and_then(|element: Node| {
                    element
                        .attr("datetime")
                        .and_then(|v: &str| insert!(dates, key, v))
                });
                element
                    .find(Name("a"))
                    .next()
                    .and_then(|element: Node| insert!(extras, key, element.text().trim()));
            });
        insert!(info, "Extras", extras);
        insert!(info, "Dates", dates);
        Ok(info)
    }

    async fn get_images(&self, manga: String, chapter: String) -> Result<(Vec<String>, Value)> {
        let url: String = format!("https://manhuascan.us/manga/{manga}/{chapter}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(
                Name("div")
                    .and(Attr("id", "readerarea"))
                    .descendant(Name("img")),
            )
            .map(|img: Node| {
                Ok(img
                    .attr("src")
                    .ok_or_else(|| Error::parser(&url, "Invalid image attr"))?
                    .to_owned())
            })
            .collect::<Result<Vec<String>>>()?;
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<BasicHashMap>> {
        let url: String = format!("https://manhuascan.us/manga/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        Ok(document
            .find(Name("div").and(Class("eph-num")).descendant(Name("a")))
            .filter_map(|a: Node| {
                a.attr("href").and_then(|href: &str| {
                    href.split("/").last().map(|last: &str| {
                        HashMap::from([
                            ("url".to_owned(), last.to_owned()),
                            ("name".to_owned(), self.rename_chapter(last.to_owned())),
                        ])
                    })
                })
            })
            .collect())
    }

    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Result<Vec<BasicHashMap>> {
        let mut results: Vec<BasicHashMap> = Vec::new();
        let mut page: u32 = 1;
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let url: String =
                format!("https://manhuascan.us/manga-list?search={keyword}&page={page}");
            let (response, new_client) = match self.send_simple_request(&url, client).await {
                Ok(result) => result,
                Err(_) => return Ok(results),
            };
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document.find(Name("div").and(Class("bsx"))).collect();
            if mangas.is_empty() {
                break;
            }
            for manga in mangas {
                let Some(title) = manga
                    .find(Name("a"))
                    .next()
                    .and_then(|title_element: Node| title_element.attr("title"))
                else {
                    continue;
                };
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(url) = manga
                    .find(Name("a"))
                    .next()
                    .and_then(|title_element: Node| {
                        title_element
                            .attr("href")
                            .and_then(|href: &str| href.split('/').last())
                    })
                else {
                    continue;
                };
                let mut result: BasicHashMap =
                    search_map!(title, self.base.domain, "url", url, page);
                manga
                    .find(Name("div").and(Class("adds")).descendant(Name("a")))
                    .next()
                    .and_then(|chapter: Node| {
                        chapter.attr("href").and_then(|href: &str| {
                            href.split('/').last().and_then(|last: &str| {
                                result.insert("latest_chapter".to_owned(), last.to_owned())
                            })
                        })
                    });
                manga.find(Name("img")).next().and_then(|element: Node| {
                    element
                        .attr("src")
                        .and_then(|src: &str| result.insert("thumbnail".to_owned(), src.to_owned()))
                });
                results.push(result);
            }
            page += 1;
            self.sleep(sleep_time);
        }
        Ok(results)
    }
}

impl Manhuascan {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "manhuascan.us",
                logo: "https://manhuascan.us/fav.png?v=1",
                sample: HashMap::from([("manga", "secret-class")]),
                is_searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
