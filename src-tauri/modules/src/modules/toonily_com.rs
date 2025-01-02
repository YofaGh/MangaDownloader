use async_trait::async_trait;
use reqwest::{
    header::{HeaderMap, HeaderValue, COOKIE, REFERER},
    Client, Method,
};
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::collections::HashMap;

use crate::{
    errors::AppError,
    models::{BaseModule, Module},
};

pub struct Toonily {
    base: BaseModule,
}

#[async_trait]
impl Module for Toonily {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://toonily.com/webtoon/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        let info_box: Node = document
            .find(Name("div").and(Class("tab-summary")))
            .next()
            .ok_or_else(|| AppError::parser(&manga, "div tab_summary"))?;
        info_box
            .find(Name("img"))
            .next()
            .and_then(|element: Node<'_>| {
                element.attr("data-src").and_then(|src: &str| {
                    info.insert("Cover".to_string(), to_value(src).unwrap_or_default())
                })
            });
        info_box
            .find(Name("div").and(Class("post-title")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("h1"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.first_child().and_then(|first: Node<'_>| {
                            info.insert(
                                "Title".to_string(),
                                to_value(first.text().trim()).unwrap_or_default(),
                            )
                        })
                    })
            });
        info_box
            .find(Name("div").and(Class("post-status")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("div").and(Class("summary-content")))
                    .nth(1)
                    .and_then(|element: Node<'_>| {
                        info.insert(
                            "Status".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    })
            });
        document
            .find(Name("div").and(Class("summary__content")))
            .next()
            .and_then(|element: Node<'_>| {
                info.insert(
                    "Summary".to_string(),
                    to_value(element.text().trim()).unwrap_or_default(),
                )
            });
        document
            .find(Name("span").and(Attr("id", "averagerate")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .text()
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .and_then(|rating| {
                        info.insert("Rating".to_string(), to_value(rating).unwrap_or_default())
                    })
            });
        document
            .find(Name("div").and(Class("wp-manga-tags-list")))
            .next()
            .and_then(|tags: Node<'_>| {
                let tags: Vec<String> = tags
                    .find(Name("a"))
                    .map(|a: Node| a.text().trim().replace('#', "").to_string())
                    .collect();
                extras.insert("Tags".to_string(), to_value(tags).unwrap_or_default())
            });
        document
            .find(Name("div").and(Class("manga-info-row")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("div").and(Class("post-content_item")))
                    .for_each(|box_elem: Node<'_>| {
                        box_elem
                            .find(Name("h5"))
                            .next()
                            .and_then(|box_str: Node<'_>| {
                                if box_str.text().contains("Alt Name") {
                                    box_elem
                                        .find(Name("div").and(Class("summary-content")))
                                        .next()
                                        .and_then(|element| {
                                            info.insert(
                                                "Alternative".to_string(),
                                                to_value(element.text().trim()).unwrap_or_default(),
                                            )
                                        })
                                } else {
                                    extras.insert(
                                        box_str.text().replace("(s)", "s").to_string(),
                                        to_value(
                                            box_elem
                                                .find(Name("a"))
                                                .map(|a: Node| a.text())
                                                .collect::<Vec<_>>(),
                                        )
                                        .unwrap_or_default(),
                                    )
                                }
                            });
                    });
                Some(())
            });
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://toonily.com/webtoon/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        Ok(document
            .find(Name("li").and(Class("wp-manga-chapter")))
            .filter_map(|div: Node| {
                div.find(Name("a")).next().and_then(|a: Node<'_>| {
                    a.attr("href").and_then(|href: &str| {
                        href.split('/').nth_back(1).and_then(|slash: &str| {
                            Some(HashMap::from([
                                ("url".to_string(), slash.to_string()),
                                ("name".to_string(), self.rename_chapter(slash.to_string())),
                            ]))
                        })
                    })
                })
            })
            .collect())
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), AppError> {
        let url: String = format!("https://toonily.com/webtoon/{manga}/{chapter}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Name("div").and(Class("reading-content")))
            .next()
            .ok_or_else(|| AppError::parser(&chapter, "div reading-content"))?
            .find(Name("img"))
            .filter_map(|img: Node| {
                img.attr("data-src")
                    .and_then(|src: &str| Some(src.trim().to_string()))
            })
            .collect();
        let save_names: Vec<String> = images
            .iter()
            .enumerate()
            .map(|(i, img)| format!("{:03}.{}", i + 1, img.split('.').last().unwrap()))
            .collect();
        Ok((images, to_value(save_names).unwrap_or_default()))
    }

    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Result<Vec<HashMap<String, String>>, AppError> {
        let mut results: Vec<HashMap<String, String>> = Vec::new();
        let mut page: u32 = 1;
        let mut search_headers: HeaderMap = HeaderMap::new();
        search_headers.insert(COOKIE, HeaderValue::from_static("toonily-mature=1"));
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let url: String = format!("https://toonily.com/search/{keyword}/page/{page}/");
            let (response, new_client) = self
                .send_request(
                    &url,
                    Method::GET,
                    search_headers.to_owned(),
                    Some(true),
                    None,
                    None,
                    None,
                    client,
                )
                .await?;
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
                let title: String = details.text().trim().to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(url) = details.find(Name("a")).next().and_then(|a: Node<'_>| {
                    a.attr("href")
                        .and_then(|href: &str| href.split('/').nth_back(1))
                }) else {
                    continue;
                };
                let mut result: HashMap<String, String> = HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("url".to_string(), url.to_string()),
                    ("page".to_string(), page.to_string()),
                ]);
                manga.find(Name("img")).next().and_then(|img: Node<'_>| {
                    img.attr("data-src").and_then(|src: &str| {
                        result.insert("thumbnail".to_string(), src.to_string())
                    })
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
                searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
