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
    errors::Error,
    insert,
    models::{BaseModule, Module},
    search_map,
};

pub struct Manytoon {
    base: BaseModule,
}

#[async_trait]
impl Module for Manytoon {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_webtoon_url(&self, manga: String) -> Result<String, Error> {
        Ok(format!("https://manytoon.com/comic/{manga}"))
    }
    async fn get_chapter_url(&self, manga: String, chapter: String) -> Result<String, Error> {
        Ok(format!("https://manytoon.com/comic/{manga}/{chapter}/"))
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, Error> {
        let url: String = format!("https://manytoon.com/comic/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        document
            .find(Name("div").and(Class("post-title")).descendant(Name("h1")))
            .next()
            .and_then(|element: Node| {
                element
                    .last_child()
                    .and_then(|last: Node| insert!(info, "Title", last.text().trim()))
            });
        document
            .find(
                Name("div")
                    .and(Class("summary__content"))
                    .descendant(Name("p")),
            )
            .next()
            .and_then(|element: Node| {
                element
                    .first_child()
                    .and_then(|first: Node| insert!(info, "Summary", first.text().trim()))
            });
        document
            .find(Name("span").and(Attr("class", "score font-meta total_votes")))
            .next()
            .and_then(|element: Node| {
                element
                    .text()
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .and_then(|rating: f64| insert!(info, "Rating", rating))
            });
        document
            .find(
                Name("div")
                    .and(Class("post-content"))
                    .descendant(Name("div").and(Class("post-content_item"))),
            )
            .filter(|n: &Node| !n.text().contains("Rating"))
            .for_each(|box_elem: Node| {
                let (Some(info_v), Some(info_k)) = (
                    box_elem
                        .find(Name("div").and(Class("summary-content")))
                        .next(),
                    box_elem
                        .find(Name("div").and(Class("summary-heading")))
                        .next(),
                ) else {
                    return;
                };
                let info_k: String = info_k.text().trim().replace("(s)", "s");
                let inf_a: Vec<String> = info_v.find(Name("a")).map(|a: Node| a.text()).collect();
                if inf_a.is_empty() {
                    insert!(extras, info_k, info_v.text().trim());
                } else {
                    insert!(extras, info_k, inf_a);
                }
            });
        let Some(info_box) = document.find(Name("div").and(Class("tab-summary"))).next() else {
            insert!(info, "Extras", extras);
            return Ok(info);
        };
        info_box.find(Name("img")).next().and_then(|element: Node| {
            element
                .attr("src")
                .and_then(|src: &str| insert!(info, "Cover", src))
        });
        info_box
            .find(Name("div").and(Class("post-status")))
            .next()
            .and_then(|element: Node| {
                element
                    .find(Name("div").and(Class("summary-content")))
                    .next()
                    .and_then(|element: Node| insert!(extras, "Release", element.text().trim()));
                element
                    .find(Name("div").and(Class("summary-content")))
                    .nth(1)
                    .and_then(|element: Node| insert!(info, "Status", element.text().trim()))
            });
        insert!(info, "Extras", extras);
        Ok(info)
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<HashMap<String, String>>, Error> {
        let url: String = format!("https://manytoon.com/comic/{manga}");
        let (response, client) = self.send_simple_request(&url, None).await?;
        let data: Value = {
            let document: Document = Document::from(response.text().await?.as_str());
            let post_id: &str = document
                .find(Name("a").and(Class("wp-manga-action-button")))
                .next()
                .ok_or_else(|| Error::parser(&manga, "a wp-manga-action-button"))?
                .attr("data-post")
                .ok_or_else(|| Error::parser(&manga, "data-post"))?;
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
            .find(
                Name("li")
                    .and(Class("wp-manga-chapter"))
                    .descendant(Name("a")),
            )
            .filter_map(|div: Node| {
                div.attr("href").and_then(|href: &str| {
                    href.split('/').nth_back(1).and_then(|last: &str| {
                        Some(HashMap::from([
                            ("url".to_owned(), last.to_owned()),
                            ("name".to_owned(), self.rename_chapter(last.to_owned())),
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
    ) -> Result<(Vec<String>, Value), Error> {
        let url: String = format!("https://manytoon.com/comic/{manga}/{chapter}/");
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
                    .attr("src")
                    .ok_or_else(|| Error::parser(&url, "Invalid image attr"))?
                    .trim()
                    .to_owned())
            })
            .collect::<Result<Vec<String>, Error>>()?;
        Ok((images, Value::Bool(false)))
    }

    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Result<Vec<HashMap<String, String>>, Error> {
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
                    .find(Name("div").and(Class("post-title")).descendant(Name("a")))
                    .next()
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
                let mut result: HashMap<String, String> =
                    search_map!(title, self.base.domain, "url", url, page);
                manga.find(Name("img")).next().and_then(|element: Node| {
                    element
                        .attr("src")
                        .and_then(|src: &str| result.insert("thumbnail".to_owned(), src.to_owned()))
                });
                manga
                    .find(
                        Name("span")
                            .and(Attr("class", "chapter font-meta"))
                            .descendant(Name("a")),
                    )
                    .next()
                    .and_then(|element: Node| {
                        element.attr("href").and_then(|href: &str| {
                            href.split('/').nth_back(1).and_then(|chapter: &str| {
                                result.insert("latest_chapter".to_owned(), chapter.to_owned())
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
                is_searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
