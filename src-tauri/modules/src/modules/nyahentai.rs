use crate::prelude::*;

pub struct Nyahentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Nyahentai {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_webtoon_url(&self, code: String) -> Result<String> {
        Ok(format!("https://nyahentai.red/g/{code}/"))
    }
    async fn get_info(&self, code: String) -> Result<ValueHashMap> {
        let url: String = format!("https://nyahentai.red/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: ValueHashMap = HashMap::new();
        let mut extras: ValueHashMap = HashMap::new();
        let mut dates: ValueHashMap = HashMap::new();
        document
            .find(Attr("id", "cover").descendant(Name("img")))
            .next()
            .and_then(|img: Node| {
                img.attr("data-src")
                    .and_then(|src: &str| insert!(info, "Cover", src))
            });
        document
            .find(Attr("id", "info").descendant(Name("h1").or(Name("h2"))))
            .for_each(|info_box: Node| {
                if info_box.name() == Some("h1") {
                    insert!(info, "Title", info_box.text().trim());
                } else {
                    insert!(info, "Alternative", info_box.text().trim());
                };
            });
        document
            .find(Name("time"))
            .next()
            .and_then(|uploaded_element: Node| {
                uploaded_element
                    .attr("datetime")
                    .and_then(|datetime: &str| insert!(dates, "Uploaded", datetime))
            });
        document
            .find(Name("section").and(Attr("id", "tags")))
            .find_map(|tags_section: Node| {
                tags_section
                    .find(|tag: &Node| tag.text().contains("Pages:"))
                    .next()
                    .and_then(|pages_element: Node| {
                        insert!(
                            info,
                            "Pages",
                            pages_element.text().replace("Pages:", "").trim()
                        )
                    })
            });
        document
            .find(
                Name("section")
                    .and(Attr("id", "tags"))
                    .descendant(Attr("class", "tag-container field-name ")),
            )
            .filter(|tag: &Node| {
                !tag.text().contains("Pages:") && !tag.text().contains("Uploaded:")
            })
            .for_each(|tag: Node| {
                tag.first_child().and_then(|first: Node| {
                    let values: Vec<String> = tag
                        .find(Name("a"))
                        .filter_map(|link: Node| {
                            link.find(Name("span").and(Class("name")))
                                .next()
                                .map(|span: Node| span.text())
                        })
                        .collect();
                    insert!(extras, first.text().trim(), values)
                });
            });
        insert!(info, "Extras", extras);
        insert!(info, "Dates", dates);
        Ok(info)
    }

    async fn get_images(&self, code: String, _: String) -> Result<(Vec<String>, Value)> {
        let url: String = format!("https://nyahentai.red/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Class("gallerythumb").and(Name("a")).descendant(Name("img")))
            .map(|node: Node| {
                let image: &str = node
                    .attr("data-src")
                    .ok_or_else(|| Error::parser(&url, "Invalid image attr"))?;
                let imagen: String = image.replace("//t", "//i");
                let name: &str = imagen
                    .rsplit_once("/")
                    .ok_or_else(|| Error::parser(&url, "Invalid image filename format"))?
                    .0;
                let ext: String = image
                    .rsplit('/')
                    .next()
                    .ok_or_else(|| Error::parser(&url, "Invalid image filename extension"))?
                    .replace("t.", ".");
                Ok(format!("{name}/{ext}"))
            })
            .collect::<Result<Vec<String>>>()?;
        Ok((images, Value::Bool(false)))
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
            let url: String = format!("https://nyahentai.red/search?q={keyword}&page={page}");
            let (response, new_client) = match self.send_simple_request(&url, client).await {
                Ok(result) => result,
                Err(_) => return Ok(results),
            };
            client = Some(new_client);
            let document: Document = Document::from(response.text().await?.as_str());
            let doujins: Vec<Node> = document
                .find(Name("div").and(Attr("class", "gallery")))
                .collect();
            if doujins.is_empty() {
                break;
            }
            for doujin in doujins {
                if absolute && !doujin.text().contains(&keyword) {
                    continue;
                }
                let Some(title) = doujin
                    .find(Name("div").and(Attr("class", "caption")))
                    .next()
                else {
                    continue;
                };
                let Some(code) = doujin
                    .find(Name("a"))
                    .next()
                    .and_then(|a: Node| a.attr("href"))
                else {
                    continue;
                };
                let code: String = code.replace("/g/", "").replace("/", "");
                let mut result: BasicHashMap =
                    search_map!(title.text(), self.base.domain, "code", code, page);
                doujin.find(Name("img")).next().and_then(|img: Node| {
                    img.attr("data-src")
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

impl Nyahentai {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Doujin",
                domain: "nyahentai.red",
                logo: "https://nyahentai.red/front/logo.svg",
                sample: HashMap::from([("code", "1")]),
                is_searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
