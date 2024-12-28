use async_trait::async_trait;
use reqwest::{header::HeaderMap, Client, Method};
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::{json, to_value, Value};
use std::{collections::HashMap, thread, time::Duration};

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
        let info_box: Node = document
            .find(Name("div").and(Class("tab-summary")))
            .next()
            .unwrap();
        if let Some(element) = info_box.find(Name("img")).next() {
            info.insert(
                "Cover".to_owned(),
                to_value(element.attr("src").unwrap_or("")).unwrap_or_default(),
            );
        }
        if let Some(element) = document.find(Name("div").or(Class("post-title"))).next() {
            if let Some(element) = element.find(Name("h1")).next() {
                info.insert(
                    "Title".to_owned(),
                    to_value(element.last_child().unwrap().text().trim()).unwrap_or_default(),
                );
            }
        }
        if let Some(element) = document
            .find(Name("div").and(Class("summary__content")))
            .next()
        {
            if let Some(element) = element.find(Name("p")).next() {
                info.insert(
                    "Summary".to_owned(),
                    to_value(element.first_child().unwrap().text().trim()).unwrap_or_default(),
                );
            }
        }
        if let Some(element) = document
            .find(Name("span").and(Attr("class", "score font-meta total_votes")))
            .next()
        {
            info.insert(
                "Rating".to_owned(),
                to_value(element.text().trim().parse::<f64>().unwrap_or(0.0)).unwrap_or_default(),
            );
        }
        if let Some(element) = info_box.find(Name("div").and(Class("post-status"))).next() {
            if let Some(element) = element
                .find(Name("div").and(Class("summary-content")))
                .next()
            {
                extras.insert(
                    "Release".to_owned(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
            if let Some(element) = element
                .find(Name("div").and(Class("summary-content")))
                .nth(1)
            {
                info.insert(
                    "Status".to_owned(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
        }
        let boxes: Vec<Node> = document
            .find(Name("div").and(Class("post-content")))
            .next()
            .unwrap()
            .find(Name("div").and(Class("post-content_item")))
            .collect();
        for box_elem in boxes {
            if box_elem.text().contains("Rating") {
                continue;
            }
            if box_elem.text().contains("Alternative") {
                info.insert(
                    "Alternative".to_string(),
                    to_value(
                        box_elem
                            .find(Name("div").and(Class("summary-content")))
                            .next()
                            .unwrap()
                            .text()
                            .trim(),
                    )
                    .unwrap_or_default(),
                );
            } else {
                let box_str: String = box_elem
                    .find(Name("div").and(Class("summary-heading")))
                    .next()
                    .unwrap()
                    .text()
                    .replace("(s)", "s")
                    .trim()
                    .to_string();
                let info_key = box_elem
                    .find(Name("div").and(Class("summary-content")))
                    .next()
                    .unwrap();
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
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_chapters(
        &self,
        manga: String,
    ) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://manytoon.com/comic/{manga}");
        let (response, client) = self.send_simple_request(&url, None).await?;
        let data: Value = {
            let document: Document = Document::from(response.text().await?.as_str());
            let post_id: String = document
                .find(Name("a").and(Class("wp-manga-action-button")))
                .next()
                .unwrap()
                .attr("data-post")
                .unwrap()
                .to_string();
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
        let chapters: Vec<HashMap<String, String>> = document
            .find(Name("li").and(Class("wp-manga-chapter")))
            .map(|div: Node| {
                let chapter_url: &str = div
                    .find(Name("a"))
                    .next()
                    .unwrap()
                    .attr("href")
                    .unwrap()
                    .split('/')
                    .nth_back(1)
                    .unwrap();
                HashMap::from([
                    ("url".to_string(), chapter_url.to_string()),
                    (
                        "name".to_string(),
                        self.rename_chapter(chapter_url.to_string()),
                    ),
                ])
            })
            .collect();
        Ok(chapters)
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
            .unwrap()
            .find(Name("img"))
            .map(|img: Node| img.attr("src").unwrap().trim().to_string())
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
                let details: Node = manga
                    .find(Name("div").and(Class("post-title")))
                    .next()
                    .unwrap()
                    .find(Name("a"))
                    .next()
                    .unwrap();
                let title: String = details.text().trim().to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let url: String = details
                    .attr("href")
                    .unwrap()
                    .split('/')
                    .nth_back(1)
                    .unwrap()
                    .to_string();
                let thumbnail: String = manga
                    .find(Name("img"))
                    .next()
                    .unwrap()
                    .attr("src")
                    .unwrap_or("")
                    .to_string();
                let mut latest_chapter: String = String::default();
                if let Some(element) = manga
                    .find(Name("span").and(Attr("class", "chapter font-meta")))
                    .next()
                {
                    if let Some(element) = element.find(Name("a")).next() {
                        latest_chapter = element
                            .attr("href")
                            .unwrap()
                            .split('/')
                            .nth_back(1)
                            .unwrap()
                            .to_string();
                    }
                }
                results.push(HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("url".to_string(), url),
                    ("thumbnail".to_string(), thumbnail),
                    ("latest_chapter".to_string(), latest_chapter),
                    ("page".to_string(), page.to_string()),
                ]));
            }
            page += 1;
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
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
