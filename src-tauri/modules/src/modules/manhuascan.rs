use async_trait::async_trait;
use reqwest::Client;
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

pub struct Manhuascan {
    base: BaseModule,
}

#[async_trait]
impl Module for Manhuascan {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://manhuascan.us/manga/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<&str, Value> = HashMap::new();
        let mut dates: HashMap<&str, Value> = HashMap::new();
        document
            .find(Name("img").and(Attr("class", "attachment- size- wp-post-image")))
            .next()
            .and_then(|element: Node<'_>| {
                element.attr("src").and_then(|v: &str| {
                    info.insert("Cover".to_string(), to_value(v).unwrap_or_default())
                })
            });
        document
            .find(Name("h1").and(Class("entry-title")))
            .next()
            .and_then(|element: Node| {
                info.insert(
                    "Title".to_string(),
                    to_value(element.text().trim()).unwrap_or_default(),
                )
            });
        document
            .find(Name("span").and(Class("alternative")))
            .next()
            .and_then(|element: Node| {
                info.insert(
                    "Alternative".to_string(),
                    to_value(element.text().trim().replace("Other Name: ", "")).unwrap_or_default(),
                )
            });
        document
            .find(Name("div").and(Attr("class", "entry-content entry-content-single")))
            .next()
            .and_then(|element: Node| {
                info.insert(
                    "Summary".to_string(),
                    to_value(element.text().trim()).unwrap_or_default(),
                )
            });
        document
            .find(Name("div").and(Class("detail_rate")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("span"))
                    .next()
                    .and_then(|span: Node<'_>| {
                        info.insert(
                            "Rating".to_string(),
                            to_value(
                                span.text()
                                    .trim()
                                    .replace("/5", "")
                                    .parse::<f32>()
                                    .unwrap_or_default(),
                            )
                            .unwrap_or_default(),
                        )
                    })
            });
        let Some(box_node) = document
            .find(Name("div").and(Attr("class", "tsinfo bixbox")))
            .next()
        else {
            return Ok(info);
        };
        box_node
            .find(|n: &Node| n.text().contains("Status"))
            .next()
            .and_then(|n: Node| {
                n.find(Name("i")).next().and_then(|element: Node<'_>| {
                    info.insert(
                        "Status".to_string(),
                        to_value(element.text().trim()).unwrap_or_default(),
                    )
                })
            });
        box_node
            .find(|n: &Node| n.text().contains("Author"))
            .next()
            .and_then(|n: Node| {
                n.find(Name("a")).next().and_then(|element: Node<'_>| {
                    extras.insert(
                        "Authors",
                        to_value(element.text().trim()).unwrap_or_default(),
                    )
                })
            });
        box_node
            .find(|n: &Node| n.text().contains("Artist"))
            .next()
            .and_then(|n: Node| {
                n.find(Name("a")).next().and_then(|element: Node<'_>| {
                    extras.insert(
                        "Artists",
                        to_value(element.text().trim()).unwrap_or_default(),
                    )
                })
            });
        box_node
            .find(|n: &Node| n.text().contains("Posted"))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("time"))
                    .next()
                    .and_then(|time: Node<'_>| {
                        time.attr("datetime").and_then(|v: &str| {
                            dates.insert("Posted On", to_value(v).unwrap_or_default())
                        })
                    })
            });
        box_node
            .find(|n: &Node| n.text().contains("Updated"))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("time"))
                    .next()
                    .and_then(|time: Node<'_>| {
                        time.attr("datetime").and_then(|v: &str| {
                            dates.insert("Updated On", to_value(v).unwrap_or_default())
                        })
                    })
            });
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        info.insert("Dates".to_string(), to_value(dates).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), AppError> {
        let url: String = format!("https://manhuascan.us/manga/{manga}/{chapter}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Name("div").and(Attr("id", "readerarea")))
            .next()
            .ok_or_else(|| AppError::parser(&manga, "readerarea"))?
            .find(Name("img"))
            .filter_map(|img: Node| img.attr("src").and_then(|v: &str| Some(v.to_string())))
            .collect();
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://manhuascan.us/manga/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        Ok(document
            .find(Name("div").and(Class("eph-num")))
            .filter_map(|div: Node<'_>| {
                div.find(Name("a")).next().and_then(|a: Node<'_>| {
                    a.attr("href").and_then(|href: &str| {
                        href.split("/").last().and_then(|last: &str| {
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
            let (response, new_client) = self
                .send_simple_request(
                    &format!("https://manhuascan.us/manga-list?search={keyword}&page={page}"),
                    client,
                )
                .await?;
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document.find(Name("div").and(Class("bsx"))).collect();
            if mangas.len() == 0 {
                break;
            }
            for manga in mangas {
                let Some(title) = manga
                    .find(Name("a"))
                    .next()
                    .and_then(|title_element: Node<'_>| title_element.attr("title"))
                else {
                    continue;
                };
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(url) = manga
                    .find(Name("a"))
                    .next()
                    .and_then(|title_element: Node<'_>| {
                        title_element
                            .attr("href")
                            .and_then(|href: &str| href.split('/').last())
                    })
                else {
                    continue;
                };
                let mut result: HashMap<String, String> = HashMap::from([
                    ("name".to_string(), title.to_string()),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("url".to_string(), url.to_string()),
                    ("page".to_string(), page.to_string()),
                ]);
                manga
                    .find(Name("div").and(Class("adds")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element
                            .find(Name("a"))
                            .next()
                            .and_then(|chapter: Node<'_>| {
                                chapter.attr("href").and_then(|href: &str| {
                                    href.split('/').last().and_then(|last: &str| {
                                        result
                                            .insert("latest_chapter".to_string(), last.to_string())
                                    })
                                })
                            })
                    });
                manga
                    .find(Name("img"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.attr("src").and_then(|src: &str| {
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

impl Manhuascan {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "manhuascan.us",
                logo: "https://manhuascan.us/fav.png?v=1",
                sample: HashMap::from([("manga", "secret-class")]),
                searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
