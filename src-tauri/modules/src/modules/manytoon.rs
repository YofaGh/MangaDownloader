use async_trait::async_trait;
use reqwest::{header::HeaderMap, Client, Method};
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::{json, to_value, Value};
use std::collections::HashMap;

use crate::{
    errors::AppError,
    models::{BaseModule, Module},
};

pub struct Manytoon {
    base: BaseModule,
}

#[async_trait]
impl Module for Manytoon {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://manytoon.com/comic/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        document
            .find(Name("div").and(Class("post-title")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("h1"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.last_child().and_then(|last: Node<'_>| {
                            info.insert(
                                "Title".to_string(),
                                to_value(last.text().trim()).unwrap_or_default(),
                            )
                        })
                    })
            });
        document
            .find(Name("div").and(Class("summary__content")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("p"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.first_child().and_then(|first: Node<'_>| {
                            info.insert(
                                "Summary".to_string(),
                                to_value(first.text().trim()).unwrap_or_default(),
                            )
                        })
                    })
            });
        document
            .find(Name("span").and(Attr("class", "score font-meta total_votes")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .text()
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .and_then(|rating: f64| {
                        info.insert("Rating".to_string(), to_value(rating).unwrap_or_default())
                    })
            });
        let boxes: Vec<Node> = document
            .find(Name("div").and(Class("post-content")))
            .next()
            .and_then(|element: Node<'_>| {
                Some(
                    element
                        .find(Name("div").and(Class("post-content_item")))
                        .collect(),
                )
            })
            .unwrap_or_default();
        for box_elem in boxes {
            if box_elem.text().contains("Rating") {
                continue;
            }
            if box_elem.text().contains("Alternative") {
                box_elem
                    .find(Name("div").and(Class("summary-content")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        info.insert(
                            "Alternative".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    });
            } else {
                let (Some(box_str), Some(info_key)) = (
                    box_elem
                        .find(Name("div").and(Class("summary-heading")))
                        .next(),
                    box_elem
                        .find(Name("div").and(Class("summary-content")))
                        .next(),
                ) else {
                    continue;
                };
                let box_str: String = box_str.text().replace("(s)", "s").trim().to_string();
                if info_key.find(Name("a")).next().is_some() {
                    extras.insert(
                        box_str,
                        to_value(
                            info_key
                                .find(Name("a"))
                                .map(|a: Node| a.text())
                                .collect::<Vec<_>>(),
                        )
                        .unwrap_or_default(),
                    );
                } else {
                    extras.insert(
                        box_str,
                        to_value(info_key.text().trim()).unwrap_or_default(),
                    );
                }
            }
        }
        let Some(info_box) = document.find(Name("div").and(Class("tab-summary"))).next() else {
            info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
            return Ok(info);
        };
        info_box
            .find(Name("img"))
            .next()
            .and_then(|element: Node<'_>| {
                element.attr("src").and_then(|src: &str| {
                    info.insert("Cover".to_string(), to_value(src).unwrap_or_default())
                })
            });
        info_box
            .find(Name("div").and(Class("post-status")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("div").and(Class("summary-content")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        extras.insert(
                            "Release".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    });
                element
                    .find(Name("div").and(Class("summary-content")))
                    .nth(1)
                    .and_then(|element: Node<'_>| {
                        extras.insert(
                            "Status".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    })
            });
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://manytoon.com/comic/{manga}");
        let (response, client) = self.send_simple_request(&url, None).await?;
        let data: Value = {
            let document: Document = Document::from(response.text().await?.as_str());
            let post_id: &str = document
                .find(Name("a").and(Class("wp-manga-action-button")))
                .next()
                .ok_or_else(|| AppError::parser(&manga, "a wp-manga-action-button"))?
                .attr("data-post")
                .ok_or_else(|| AppError::parser(&manga, "data-post"))?;
            json!({
                "action": "ajax_chap",
                "post_id": post_id
            })
        };
        let (response, _) = self
            .send_request(
                "https://manytoon.com/wp-admin/admin-ajax.php",
                Method::POST,
                HeaderMap::default(),
                Some(true),
                Some(data),
                None,
                None,
                Some(client),
            )
            .await?;
        let document: Document = Document::from(response.text().await?.as_str());
        Ok(document
            .find(Name("li").and(Class("wp-manga-chapter")))
            .filter_map(|div: Node<'_>| {
                div.find(Name("a")).next().and_then(|a: Node<'_>| {
                    a.attr("href").and_then(|href: &str| {
                        href.split('/').nth_back(1).and_then(|last: &str| {
                            Some(HashMap::from([
                                ("url".to_string(), last.to_string()),
                                ("name".to_string(), self.rename_chapter(last.to_string())),
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
        let url: String = format!("https://manytoon.com/comic/{manga}/{chapter}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Name("div").and(Class("reading-content")))
            .next()
            .ok_or_else(|| AppError::parser(&chapter, "div reading-content"))?
            .find(Name("img"))
            .filter_map(|img: Node| {
                img.attr("src")
                    .and_then(|src: &str| Some(src.trim().to_string()))
            })
            .collect();
        Ok((images, Value::from(false)))
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
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let url: String =
                format!("https://manytoon.com/page/{page}/?s={keyword}&post_type=wp-manga");
            let (response, new_client) = self.send_simple_request(&url, client).await?;
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document
                .find(Name("div").and(Attr("class", "col-6 col-md-3 badge-pos-1")))
                .collect();
            for manga in mangas {
                let Some(details) = manga
                    .find(Name("div").and(Class("post-title")))
                    .next()
                    .and_then(|element: Node<'_>| element.find(Name("a")).next())
                else {
                    continue;
                };
                let title: String = details.text().trim().to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(url) = details
                    .attr("href")
                    .and_then(|href: &str| href.split('/').nth_back(1))
                else {
                    continue;
                };
                let mut result: HashMap<String, String> = HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("url".to_string(), url.to_string()),
                    ("page".to_string(), page.to_string()),
                ]);
                manga
                    .find(Name("img"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.attr("src").and_then(|src: &str| {
                            result.insert("thumbnail".to_string(), src.to_string())
                        })
                    });
                manga
                    .find(Name("span").and(Attr("class", "chapter font-meta")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element
                            .find(Name("a"))
                            .next()
                            .and_then(|element: Node<'_>| {
                                element.attr("href").and_then(|href: &str| {
                                    href.split('/').nth_back(1).and_then(|chapter: &str| {
                                        result.insert(
                                            "latest_chapter".to_string(),
                                            chapter.to_string(),
                                        )
                                    })
                                })
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
impl Manytoon {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "manytoon.com",
                logo: "https://manytoon.com/favicon.ico",
                sample: HashMap::from([("manga", "my-illustrator")]),
                searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
