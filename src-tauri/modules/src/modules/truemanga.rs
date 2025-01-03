use async_trait::async_trait;
use reqwest::{
    header::{HeaderMap, HeaderValue, REFERER},
    Client,
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

pub struct Truemanga {
    base: BaseModule,
}

#[async_trait]
impl Module for Truemanga {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://truemanga.com/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        let info_box: Node = document
            .find(Name("div").and(Class("book-info")))
            .next()
            .ok_or_else(|| AppError::parser(&url, "book-info"))?;
        info_box
            .find(Name("div").and(Class("img-cover")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("img"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.attr("data-src").and_then(|src: &str| {
                            info.insert("Cover".to_string(), to_value(src).unwrap_or_default())
                        })
                    })
            });
        info_box
            .find(Name("div").and(Attr("class", "name box")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("h1"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        info.insert(
                            "Title".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    });
                element
                    .find(Name("h2"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        info.insert(
                            "Alternative".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    })
            });
        document
            .find(Name("div").and(Attr("class", "section-body summary")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("p"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        info.insert(
                            "Summary".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    })
            });
        let Some(boxes) = document
            .find(Name("div").and(Attr("class", "meta box mt-1 p-10")))
            .next()
        else {
            return Ok(info);
        };
        boxes.find(Name("p")).for_each(|box_elem: Node<'_>| {
            if box_elem.text().contains("Alt Name") {
                box_elem
                    .find(Name("span"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        info.insert(
                            "Status".to_string(),
                            to_value(element.text().trim()).unwrap_or_default(),
                        )
                    });
            } else {
                box_elem
                    .find(Name("strong"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        let label: String = element.text().replace(":", "").trim().to_string();
                        let links: Vec<Node> = box_elem.find(Name("a")).collect();
                        if links.len() <= 1 {
                            box_elem
                                .find(Name("span"))
                                .next()
                                .and_then(|element: Node<'_>| {
                                    extras.insert(
                                        label,
                                        to_value(element.text().trim()).unwrap_or_default(),
                                    )
                                })
                        } else {
                            extras.insert(
                                label,
                                to_value(
                                    links
                                        .iter()
                                        .map(|link: &Node| {
                                            link.text().trim().replace(" ", "").replace("\n,", "")
                                        })
                                        .collect::<Vec<String>>(),
                                )
                                .unwrap_or_default(),
                            )
                        }
                    });
            }
        });
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://truemanga.com/{manga}");
        let (response, client) = self.send_simple_request(&url, None).await?;
        let html: String = response.text().await?;
        let book_id: String = {
            let document: Document = Document::from(html.as_str());
            let script: Node = document
                .find(|tag: &Node| tag.name() == Some("script") && tag.text().contains("bookId"))
                .next()
                .ok_or_else(|| AppError::parser(&url, "Script with bookId not found"))?;
            script
                .text()
                .split("bookId = ")
                .nth(1)
                .ok_or_else(|| AppError::parser(&url, "BookId not found in script"))?
                .split(';')
                .next()
                .ok_or_else(|| AppError::parser(&url, "Invalid bookId format"))?
                .trim()
                .to_string()
        };
        let (response, _) = self
            .send_simple_request(
                &format!("https://truemanga.com/api/manga/{book_id}/chapters"),
                Some(client),
            )
            .await?;
        let chapters_html: String = response.text().await?;
        let document: Document = Document::from(chapters_html.as_str());
        Ok(document
            .find(Name("option"))
            .filter_map(|tag: Node| {
                tag.attr("value").and_then(|value: &str| {
                    value.split("/").last().and_then(|last: &str| {
                        Some(HashMap::from([
                            ("url".to_string(), last.to_string()),
                            ("name".to_string(), tag.text()),
                        ]))
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
        let url: String = format!("https://truemanga.com/{manga}/{chapter}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let script: String = document
            .find(|tag: &Node| tag.name() == Some("script") && tag.text().contains("chapImages"))
            .next()
            .ok_or_else(|| AppError::parser(&url, "Script with chapImages not found"))?
            .text();
        let mut imgs: String = script.replace("var chapImages = '", "").trim().to_string();
        imgs.truncate(imgs.len() - 1);
        let images: Vec<String> = imgs.split(",").map(|s: &str| s.to_string()).collect();
        let save_names: Vec<String> = images
            .iter()
            .enumerate()
            .map(|(i, img)| {
                format!(
                    "{:03}.{}",
                    i + 1,
                    img.split('.').last().unwrap().split("?").next().unwrap()
                )
            })
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
            let url: String = format!("https://truemanga.com/search?q={keyword}&page={page}");
            let (response, new_client) = self.send_simple_request(&url, client).await?;
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document.find(Name("div").and(Class("book-item"))).collect();
            if mangas.is_empty() {
                break;
            }
            for manga in mangas {
                let Some(ti) = manga
                    .find(Name("div").and(Class("title")))
                    .next()
                    .and_then(|element: Node<'_>| element.find(Name("a")).next())
                else {
                    continue;
                };
                let Some(title) = ti
                    .attr("title")
                    .and_then(|element: &str| Some(element.trim().to_string()))
                else {
                    continue;
                };
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(url) = ti
                    .attr("href")
                    .and_then(|href: &str| href.split("/").last())
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
                        element.attr("data-src").and_then(|src: &str| {
                            result.insert("thumbnail".to_string(), src.to_string())
                        })
                    });
                manga
                    .find(Name("span").and(Class("latest-chapter")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.attr("title").and_then(|titlel: &str| {
                            result.insert("latest_chapter".to_string(), titlel.to_string())
                        })
                    });
                manga
                    .find(Name("div").and(Class("genres")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        result.insert(
                            "genres".to_string(),
                            element
                                .children()
                                .map(|x: Node| x.text())
                                .collect::<Vec<String>>()
                                .join(", "),
                        )
                    });
                manga
                    .find(Name("div").and(Class("summary")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        result.insert("summary".to_string(), element.text().trim().to_string())
                    });
                results.push(result);
            }
            page += 1;
            self.sleep(sleep_time);
        }
        Ok(results)
    }
}

impl Truemanga {
    pub fn new() -> Self {
        let mut download_image_headers: HeaderMap = HeaderMap::new();
        download_image_headers.insert(REFERER, HeaderValue::from_static("https://truemanga.com/"));
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "truemanga.com",
                logo: "https://truemanga.com/static/sites/truemanga/icons/favicon.ico",
                download_image_headers,
                sample: HashMap::from([("manga", "blind-play"), ("keyword", "play")]),
                searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
