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
    insert,
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
        let mut extras: HashMap<String, Value> = HashMap::new();
        let mut dates: HashMap<String, Value> = HashMap::new();
        document
            .find(Name("img").and(Attr("class", "attachment- size- wp-post-image")))
            .next()
            .and_then(|element: Node<'_>| {
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
            .and_then(|span: Node<'_>| {
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
            .find(|n: &Node| n.text().contains("Status"))
            .next()
            .and_then(|n: Node| {
                n.find(Name("i"))
                    .next()
                    .and_then(|element: Node<'_>| insert!(info, "Status", element.text().trim()))
            });
        box_node
            .find(|n: &Node| n.text().contains("Author"))
            .next()
            .and_then(|n: Node| {
                n.find(Name("a"))
                    .next()
                    .and_then(|element: Node<'_>| insert!(extras, "Authors", element.text().trim()))
            });
        box_node
            .find(|n: &Node| n.text().contains("Artist"))
            .next()
            .and_then(|n: Node| {
                n.find(Name("a"))
                    .next()
                    .and_then(|element: Node<'_>| insert!(extras, "Artists", element.text().trim()))
            });
        box_node
            .find(|n: &Node| n.text().contains("Posted"))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("time"))
                    .next()
                    .and_then(|time: Node<'_>| {
                        time.attr("datetime")
                            .and_then(|v: &str| insert!(dates, "Posted On", v))
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
                        time.attr("datetime")
                            .and_then(|v: &str| insert!(dates, "Updated On", v))
                    })
            });
        insert!(info, "Extras", extras);
        insert!(info, "Dates", dates);
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
            .map(|img: Node| {
                Ok(img
                    .attr("src")
                    .ok_or_else(|| AppError::parser(&url, "Invalid image attr"))?
                    .to_string())
            })
            .collect::<Result<Vec<String>, AppError>>()?;
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://manhuascan.us/manga/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        Ok(document
            .find(Name("div").and(Class("eph-num")).descendant(Name("a")))
            .filter_map(|a: Node<'_>| {
                a.attr("href").and_then(|href: &str| {
                    href.split("/").last().and_then(|last: &str| {
                        Some(HashMap::from([
                            ("url".to_string(), last.to_string()),
                            ("name".to_string(), self.rename_chapter(last.to_string())),
                        ]))
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
                    .find(Name("div").and(Class("adds")).descendant(Name("a")))
                    .next()
                    .and_then(|chapter: Node<'_>| {
                        chapter.attr("href").and_then(|href: &str| {
                            href.split('/').last().and_then(|last: &str| {
                                result.insert("latest_chapter".to_string(), last.to_string())
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
