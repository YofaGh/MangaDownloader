use async_trait::async_trait;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::collections::HashMap;

use crate::{
    errors::AppError,
    models::{BaseModule, Module},
};

pub struct Mangapark {
    base: BaseModule,
}

#[async_trait]
impl Module for Mangapark {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://mangapark.to/title/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        let info_box: Node = document
            .find(Attr("class", "flex flex-col md:flex-row"))
            .next()
            .ok_or_else(|| AppError::parser(&url, "info_box"))?;
        info_box
            .find(Name("img"))
            .next()
            .and_then(|cover: Node<'_>| {
                cover.attr("src").and_then(|src: &str| {
                    info.insert(
                        "Cover".to_string(),
                        to_value(src.to_string()).unwrap_or_default(),
                    )
                })
            });
        info_box
            .find(Name("h3"))
            .next()
            .and_then(|title: Node<'_>| {
                info.insert(
                    "Title".to_string(),
                    to_value(title.text().trim()).unwrap_or_default(),
                )
            });
        info_box
            .find(Name("div").and(Attr("q:key", "tz_2")))
            .next()
            .and_then(|alternative: Node<'_>| {
                info.insert(
                    "Alternative".to_string(),
                    to_value(alternative.text().trim()).unwrap_or_default(),
                )
            });
        info_box
            .find(Name("div").and(Attr("class", "limit-html prose lg:prose-lg")))
            .next()
            .and_then(|summary: Node<'_>| {
                info.insert(
                    "Summary".to_string(),
                    to_value(summary.text().trim()).unwrap_or_default(),
                )
            });
        info_box
            .find(Name("span").and(Attr("q:key", "Yn_5")))
            .next()
            .and_then(|status: Node<'_>| {
                info.insert(
                    "Status".to_string(),
                    to_value(status.text().trim()).unwrap_or_default(),
                )
            });
        info_box
            .find(Name("span").and(Attr("q:key", "lt_0")))
            .next()
            .and_then(|rating: Node<'_>| {
                rating
                    .text()
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .and_then(|rating: f64| {
                        info.insert("Rating".to_string(), to_value(rating).unwrap_or_default())
                    })
            });
        if info_box
            .find(Name("span").and(Attr("q:key", "kd_0")))
            .next()
            .is_some()
        {
            extras.insert(
                "Genres".to_string(),
                to_value(
                    info_box
                        .find(Name("span").and(Attr("q:key", "kd_0")))
                        .map(|a: Node| a.text().trim().to_string())
                        .collect::<Vec<String>>(),
                )
                .unwrap_or_default(),
            );
        }
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://mangapark.to/title/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let script: Node<'_> = document
            .find(Name("script").and(Attr("type", "qwik/json")))
            .next()
            .ok_or_else(|| AppError::parser(&url, "script"))?;
        let data: Value = serde_json::from_str(script.text().as_str())?;
        let objs: &Vec<Value> = data["objs"]
            .as_array()
            .ok_or_else(|| AppError::parser(&url, "as array"))?;
        let chapters: Vec<HashMap<String, String>> = objs
            .iter()
            .enumerate()
            .filter_map(|(i, item)| {
                item.as_str().and_then(|s: &str| {
                    if s.contains(&format!("{manga}/")) {
                        s.split('/').last().and_then(|url: &str| {
                            Some(HashMap::from([
                                ("url".to_string(), url.to_string()),
                                (
                                    "name".to_string(),
                                    self.rename_chapter(
                                        objs.get(i.wrapping_sub(1)).unwrap().to_string(),
                                    ),
                                ),
                            ]))
                        })
                    } else {
                        None
                    }
                })
            })
            .collect();
        Ok(chapters)
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), AppError> {
        let url: String = format!("https://mangapark.to/title/{manga}/{chapter}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let script: Node = document
            .find(Name("script").and(Attr("type", "qwik/json")))
            .next()
            .ok_or_else(|| AppError::parser(&url, "script"))?;
        let data: Value = serde_json::from_str(script.text().as_str())?;
        let objs: &Vec<Value> = data["objs"]
            .as_array()
            .ok_or_else(|| AppError::parser(&url, "as array"))?;
        let images: Vec<String> = objs
            .iter()
            .filter_map(|item: &Value| {
                item.as_str().and_then(|s: &str| {
                    if s.contains("/comic/") {
                        Some(s.to_string())
                    } else {
                        None
                    }
                })
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
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let url: String = format!("https://mangapark.to/search?word={keyword}&page={page}");
            let (response, new_client) = self.send_simple_request(&url, client).await?;
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document
                .find(Name("div").and(Attr("class", "flex border-b border-b-base-200 pb-5")))
                .collect();
            for manga in mangas {
                let Some(ti) = manga.find(Name("h3")).next() else {
                    continue;
                };
                let title: String = ti.text().trim().to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(url) = ti.find(Name("a")).next().and_then(|link: Node<'_>| {
                    link.attr("href")
                        .and_then(|href: &str| href.split('/').last())
                }) else {
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
                        element.attr("src").and_then(|thumbnail: &str| {
                            result.insert("thumbnail".to_string(), thumbnail.to_string())
                        })
                    });
                manga
                    .find(Name("div").and(Attr("q:key", "6N_0")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        result.insert(
                            "authors".to_string(),
                            element
                                .text()
                                .split("/")
                                .map(|m: &str| m.trim())
                                .collect::<Vec<&str>>()
                                .join(", "),
                        )
                    });
                manga
                    .find(Name("div").and(Attr("q:key", "lA_0")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        result.insert(
                            "alternatives".to_string(),
                            element
                                .text()
                                .split("/")
                                .map(|m: &str| m.trim())
                                .collect::<Vec<&str>>()
                                .join(", "),
                        )
                    });
                manga
                    .find(Name("div").and(Attr("q:key", "HB_9")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        result.insert(
                            "genres".to_string(),
                            element
                                .text()
                                .split(",")
                                .map(|m: &str| m.trim())
                                .collect::<Vec<&str>>()
                                .join(", "),
                        )
                    });
                manga
                    .find(Name("div").and(Attr("q:key", "R7_8")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element
                            .find(Name("a"))
                            .next()
                            .and_then(|element: Node<'_>| {
                                element.attr("href").and_then(|m: &str| {
                                    m.split("/").last().and_then(|m: &str| {
                                        result.insert("latest_chapter".to_string(), m.to_string())
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
impl Mangapark {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "mangapark.to",
                logo: "https://mangapark.to/public-assets/img/favicon.ico",
                sample: HashMap::from([("manga", "77478-en-sakamoto-days")]),
                searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
