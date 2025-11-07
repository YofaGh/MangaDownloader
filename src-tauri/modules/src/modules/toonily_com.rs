use reqwest::{
    header::{HeaderMap, HeaderValue, COOKIE, REFERER},
    Method,
};

use crate::prelude::*;

pub struct Toonily {
    base: BaseModule,
}

#[async_trait]
impl Module for Toonily {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_webtoon_url(&self, manga: String) -> Result<String> {
        Ok(format!("https://toonily.com/serie/{manga}/"))
    }
    async fn get_chapter_url(&self, manga: String, chapter: String) -> Result<String> {
        Ok(format!("https://toonily.com/serie/{manga}/{chapter}/"))
    }
    async fn get_info(&self, manga: String) -> Result<ValueHashMap> {
        let url: String = format!("https://toonily.com/serie/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: ValueHashMap = HashMap::new();
        let mut extras: ValueHashMap = HashMap::new();
        let info_box: Node = document
            .find(Name("div").and(Class("tab-summary")))
            .next()
            .ok_or_else(|| Error::parser(&manga, "div tab_summary"))?;
        info_box.find(Name("img")).next().and_then(|element: Node| {
            element
                .attr("data-src")
                .and_then(|src: &str| insert!(info, "Cover", src))
        });
        info_box
            .find(Name("div").and(Class("post-title")).descendant(Name("h1")))
            .next()
            .and_then(|element: Node| {
                element
                    .first_child()
                    .and_then(|first: Node| insert!(info, "Title", first.text().trim()))
            });
        info_box
            .find(
                Name("div")
                    .and(Class("post-status"))
                    .descendant(Name("div").and(Class("summary-content"))),
            )
            .nth(1)
            .and_then(|element: Node| insert!(info, "Status", element.text().trim()));
        document
            .find(Name("div").and(Class("summary__content")))
            .next()
            .and_then(|element: Node| insert!(info, "Summary", element.text().trim()));
        document
            .find(Name("span").and(Attr("id", "averagerate")))
            .next()
            .and_then(|element: Node| {
                element
                    .text()
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .and_then(|rating: f64| insert!(info, "Rating", rating))
            });
        let tags: Vec<String> = document
            .find(
                Name("div")
                    .and(Class("wp-manga-tags-list"))
                    .descendant(Name("a")),
            )
            .map(|a: Node| a.text().trim().replace('#', ""))
            .collect();
        if !tags.is_empty() {
            insert!(extras, "Tags", tags);
        };
        document
            .find(
                Name("div")
                    .and(Class("manga-info-row"))
                    .descendant(Name("div").and(Class("post-content_item"))),
            )
            .for_each(|box_elem: Node| {
                box_elem.find(Name("h5")).next().and_then(|box_str: Node| {
                    if box_str.text().contains("Alt Name") {
                        box_elem
                            .find(Name("div").and(Class("summary-content")))
                            .next()
                            .and_then(|element: Node| {
                                insert!(info, "Alternative", element.text().trim())
                            })
                    } else {
                        insert!(
                            extras,
                            box_str.text().replace("(s)", "s"),
                            box_elem
                                .find(Name("a"))
                                .map(|a: Node| a.text())
                                .collect::<Vec<String>>()
                        )
                    }
                });
            });
        insert!(info, "Extras", extras);
        Ok(info)
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<BasicHashMap>> {
        let url: String = format!("https://toonily.com/serie/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        Ok(document
            .find(
                Name("li")
                    .and(Class("wp-manga-chapter"))
                    .descendant(Name("a")),
            )
            .filter_map(|a: Node| {
                a.attr("href").and_then(|href: &str| {
                    href.split('/').nth_back(1).map(|slash: &str| {
                        HashMap::from([
                            ("url".to_owned(), slash.to_owned()),
                            ("name".to_owned(), self.rename_chapter(slash.to_owned())),
                        ])
                    })
                })
            })
            .collect())
    }

    async fn get_images(&self, manga: String, chapter: String) -> Result<(Vec<String>, Value)> {
        let url: String = format!("https://toonily.com/serie/{manga}/{chapter}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(
                Name("div")
                    .and(Class("reading-content"))
                    .descendant(Name("img")),
            )
            .map(|img: Node| {
                Ok(img
                    .attr("data-src")
                    .ok_or_else(|| Error::parser(&url, "Invalid image attr"))?
                    .trim()
                    .to_owned())
            })
            .collect::<Result<Vec<String>>>()?;
        let save_names: Vec<String> = images
            .iter()
            .enumerate()
            .map(|(i, img)| {
                let extension: &str = img
                    .split('.')
                    .last()
                    .ok_or_else(|| Error::parser(&url, "Invalid image filename extension"))?;
                Ok(format!("{:03}.{extension}", i + 1))
            })
            .collect::<Result<Vec<String>>>()?;
        Ok((images, to_value(save_names)?))
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
        let mut search_headers: HeaderMap = HeaderMap::new();
        search_headers.insert(COOKIE, HeaderValue::from_static("toonily-mature=1"));
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let url: String = format!("https://toonily.com/search/{keyword}/page/{page}/");
            let (response, new_client) = match self
                .send_request(
                    &url,
                    RequestConfig {
                        method: Method::GET,
                        headers: search_headers.to_owned(),
                        client,
                        ..Default::default()
                    },
                )
                .await
            {
                Ok(result) => result,
                Err(_) => return Ok(results),
            };
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document
                .find(Name("div").and(Attr("class", "col-6 col-sm-3 col-lg-2")))
                .collect();
            for manga in mangas {
                let Some(details) = manga
                    .find(Name("div").and(Attr("class", "post-title font-title")))
                    .next()
                else {
                    continue;
                };
                let title: String = details.text().trim().to_owned();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(url) = details.find(Name("a")).next().and_then(|a: Node| {
                    a.attr("href")
                        .and_then(|href: &str| href.split('/').nth_back(1))
                }) else {
                    continue;
                };
                let mut result: BasicHashMap =
                    search_map!(title, self.base.domain, "url", url, page);
                manga.find(Name("img")).next().and_then(|img: Node| {
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
impl Toonily {
    pub fn new() -> Self {
        let mut download_image_headers: HeaderMap = HeaderMap::new();
        download_image_headers.insert(REFERER, HeaderValue::from_static("https://toonily.com/"));
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "toonily.com",
                logo: "https://toonily.com/wp-content/uploads/2020/01/cropped-toonfavicon-1-192x192.png",
                download_image_headers,
                sample: HashMap::from([("manga", "peerless-dad")]),
                is_searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
