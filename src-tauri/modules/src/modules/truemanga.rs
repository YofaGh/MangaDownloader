use crate::models::{BaseModule, Module};
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
use std::{collections::HashMap, error::Error, thread, time::Duration};

pub struct Truemanga {
    base: BaseModule,
}

#[async_trait]
impl Module for Truemanga {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://truemanga.com/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        let info_box: Node = document
            .find(Name("div").and(Class("book-info")))
            .next()
            .unwrap();
        if let Some(element) = info_box.find(Name("div").and(Class("img-cover"))).next() {
            if let Some(element) = element.find(Name("img")).next() {
                info.insert(
                    "Cover".to_owned(),
                    to_value(element.attr("data-src").unwrap_or("")).unwrap_or_default(),
                );
            }
        }
        if let Some(element) = info_box
            .find(Name("div").and(Attr("class", "name box")))
            .next()
        {
            if let Some(element) = element.find(Name("h1")).next() {
                info.insert(
                    "Title".to_owned(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
            if let Some(element) = element.find(Name("h2")).next() {
                info.insert(
                    "Alternative".to_owned(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
        }
        if let Some(element) = document
            .find(Name("div").and(Attr("class", "section-body summary")))
            .next()
        {
            if let Some(element) = element.find(Name("p")).next() {
                info.insert(
                    "Summary".to_owned(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
        }
        let boxes: Vec<Node> = document
            .find(Name("div").and(Attr("class", "meta box mt-1 p-10")))
            .next()
            .unwrap()
            .find(Name("p"))
            .collect();
        for box_elem in boxes {
            if box_elem.text().contains("Alt Name") {
                info.insert(
                    "Status".to_string(),
                    to_value(box_elem.find(Name("span")).next().unwrap().text().trim())
                        .unwrap_or_default(),
                );
            } else {
                let label = box_elem
                    .find(Name("strong"))
                    .next()
                    .unwrap()
                    .text()
                    .replace(":", "")
                    .trim()
                    .to_string();
                let links: Vec<Node> = box_elem.find(Name("a")).collect();
                if links.len() <= 1 {
                    extras.insert(
                        label,
                        to_value(box_elem.find(Name("span")).next().unwrap().text().trim())
                            .unwrap_or_default(),
                    );
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
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        let url: String = format!("https://truemanga.com/{manga}");
        let (response, client) = self.send_simple_request(&url, None).await?;
        let html: String = response.text().await?;
        let book_id: String = {
            let document: Document = Document::from(html.as_str());
            let script: Node = document
                .find(|tag: &Node| tag.name() == Some("script") && tag.text().contains("bookId"))
                .next()
                .ok_or("Script with bookId not found")?;
            script
                .text()
                .split("bookId = ")
                .nth(1)
                .ok_or("bookId not found in script")?
                .split(';')
                .next()
                .ok_or("Invalid bookId format")?
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
        let chapters: Vec<HashMap<String, String>> = {
            let document: Document = Document::from(chapters_html.as_str());
            document
                .find(Name("option"))
                .map(|tag: Node| {
                    HashMap::from([
                        (
                            "url".to_string(),
                            tag.attr("value")
                                .unwrap_or_default()
                                .split("/")
                                .last()
                                .unwrap()
                                .to_string(),
                        ),
                        ("name".to_string(), tag.text()),
                    ])
                })
                .collect()
        };
        Ok(chapters)
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url: String = format!("https://truemanga.com/{manga}/{chapter}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let script: String = document
            .find(|tag: &Node| tag.name() == Some("script") && tag.text().contains("chapImages"))
            .next()
            .unwrap()
            .text();
        let mut imgs: String = script.replace("var chapImages = '", "").trim().to_string();
        imgs.truncate(imgs.len() - 1);
        let images: Vec<String> = imgs.split(",").map(|s| s.to_string()).collect();
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
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
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
                let ti: String = manga
                    .find(Name("div").and(Class("title")))
                    .next()
                    .unwrap()
                    .find(Name("a"))
                    .next()
                    .unwrap()
                    .attr("title")
                    .unwrap()
                    .trim()
                    .to_string();
                if absolute && !ti.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let mut result: HashMap<String, String> = HashMap::new();
                result.insert("domain".to_string(), self.base.domain.to_string());
                result.insert("name".to_string(), ti);
                result.insert(
                    "url".to_string(),
                    manga
                        .find(Name("div").and(Class("title")))
                        .next()
                        .unwrap()
                        .find(Name("a"))
                        .next()
                        .unwrap()
                        .attr("href")
                        .unwrap()
                        .split("/")
                        .last()
                        .unwrap()
                        .to_string(),
                );
                result.insert(
                    "thumbnail".to_string(),
                    manga
                        .find(Name("img"))
                        .next()
                        .unwrap()
                        .attr("data-src")
                        .unwrap()
                        .to_string(),
                );
                if let Some(element) = manga.find(Name("span").and(Class("latest-chapter"))).next()
                {
                    result.insert(
                        "latest_chapter".to_string(),
                        element.attr("title").unwrap_or_default().to_string(),
                    );
                }
                if let Some(element) = manga.find(Name("div").and(Class("genres"))).next() {
                    result.insert(
                        "genres".to_string(),
                        element
                            .children()
                            .map(|x: Node| x.text())
                            .collect::<Vec<String>>()
                            .join(", "),
                    );
                }
                if let Some(element) = manga.find(Name("div").and(Class("summary"))).next() {
                    result.insert("summary".to_string(), element.text().trim().to_string());
                }
                results.push(result);
            }
            page += 1;
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
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
