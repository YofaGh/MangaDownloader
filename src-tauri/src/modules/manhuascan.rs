use async_trait::async_trait;
use reqwest::Response;
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error, thread, time::Duration};

use crate::models::{BaseModule, Module};

pub struct Manhuascan {
    base: BaseModule,
}

#[async_trait]
impl Module for Manhuascan {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://manhuascan.us/manga/{}", manga);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<&str, Value> = HashMap::new();
        let mut dates: HashMap<&str, Value> = HashMap::new();
        if let Some(element) = document
            .find(Name("img").and(Attr("class", "attachment- size- wp-post-image")))
            .next()
        {
            info.insert(
                "Cover".to_owned(),
                to_value(element.attr("src").unwrap_or("")).unwrap_or_default(),
            );
        }
        if let Some(element) = document.find(Name("h1").and(Class("entry-title"))).next() {
            info.insert(
                "Title".to_owned(),
                to_value(element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document.find(Name("span").and(Class("alternative"))).next() {
            info.insert(
                "Alternative".to_owned(),
                to_value(element.text().trim().replace("Other Name: ", "")).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .find(Name("div").and(Attr("class", "entry-content entry-content-single")))
            .next()
        {
            info.insert(
                "Summary".to_owned(),
                to_value(element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document.find(Name("div").and(Class("detail_rate"))).next() {
            let rating_text: String = element
                .find(Name("span"))
                .next()
                .unwrap()
                .text()
                .trim()
                .replace("/5", "");
            let rating_text: f32 = match rating_text.parse() {
                Ok(v) => v,
                Err(_) => 0.0,
            };
            info.insert(
                "Rating".to_owned(),
                to_value(rating_text).unwrap_or_default(),
            );
        }
        if let Some(box_node) = document
            .find(Name("div").and(Attr("class", "tsinfo bixbox")))
            .next()
        {
            if let Some(element) = box_node
                .find(|n: &select::node::Node| n.text().contains("Status"))
                .next()
                .and_then(|n| n.find(Name("i")).next())
            {
                info.insert(
                    "Status".to_owned(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
            if let Some(element) = box_node
                .find(|n: &select::node::Node| n.text().contains("Author"))
                .next()
                .and_then(|n| n.find(Name("a")).next())
            {
                extras.insert(
                    "Authors",
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
            if let Some(element) = box_node
                .find(|n: &select::node::Node| n.text().contains("Artist"))
                .next()
                .and_then(|n| n.find(Name("a")).next())
            {
                extras.insert(
                    "Artists",
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
            if let Some(element) = box_node
                .find(|n: &select::node::Node| n.text().contains("Posted"))
                .next()
            {
                dates.insert(
                    "Posted On",
                    to_value(
                        element
                            .find(Name("time"))
                            .next()
                            .unwrap()
                            .attr("datetime")
                            .unwrap_or(""),
                    )
                    .unwrap_or_default(),
                );
            }
            if let Some(element) = box_node
                .find(|n: &select::node::Node| n.text().contains("Updated"))
                .next()
            {
                dates.insert(
                    "Updated On",
                    to_value(
                        element
                            .find(Name("time"))
                            .next()
                            .unwrap()
                            .attr("datetime")
                            .unwrap_or(""),
                    )
                    .unwrap_or_default(),
                );
            }
        }
        info.insert("Extras".to_owned(), to_value(extras).unwrap_or_default());
        info.insert("Dates".to_owned(), to_value(dates).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url: String = format!("https://manhuascan.us/manga/{}/{}", manga, chapter);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Name("div").and(Attr("id", "readerarea")))
            .next()
            .unwrap()
            .find(Name("img"))
            .filter_map(|img| img.attr("src"))
            .map(|src| src.to_string())
            .collect::<Vec<String>>();
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(
        &self,
        manga: String,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        let url: String = format!("https://manhuascan.us/manga/{}", manga);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let divs: Vec<Node> = document.find(Name("div").and(Class("eph-num"))).collect();
        let mut chapters: Vec<HashMap<String, String>> = Vec::new();
        for div in divs {
            let chapter_url = div
                .find(Name("a"))
                .next()
                .unwrap()
                .attr("href")
                .unwrap()
                .split("/")
                .last()
                .unwrap();
            chapters.push(HashMap::from([
                ("url".to_string(), chapter_url.to_string()),
                (
                    "name".to_string(),
                    self.rename_chapter(chapter_url.to_string()),
                ),
            ]));
        }
        Ok(chapters)
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
        while page <= page_limit {
            let response: Response = self
                .send_simple_request(&format!(
                    "https://manhuascan.us/manga-list?search={}&page={}",
                    keyword, page
                ))
                .await?;
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document.find(Name("div").and(Class("bsx"))).collect();
            if mangas.len() == 0 {
                break;
            }
            for manga in mangas {
                let title_element = manga.find(Name("a")).next().unwrap();
                let title = title_element.attr("title").unwrap();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let mut latest_chapter: String = String::default();
                if let Some(chapter) = manga
                    .find(Name("div").and(Class("adds")))
                    .next()
                    .unwrap()
                    .find(Name("a"))
                    .next()
                {
                    latest_chapter = chapter
                        .attr("href")
                        .unwrap_or("")
                        .split('/')
                        .last()
                        .unwrap_or("")
                        .to_string();
                }
                let url: String = title_element
                    .attr("href")
                    .unwrap_or("")
                    .split('/')
                    .last()
                    .unwrap_or("")
                    .to_string();
                let thumbnail: String = manga
                    .find(Name("img"))
                    .next()
                    .unwrap()
                    .attr("src")
                    .unwrap_or("")
                    .to_string();
                results.push(HashMap::from([
                    ("name".to_string(), title.to_string()),
                    ("domain".to_string(), "manhuascan.us".to_string()),
                    ("url".to_string(), url),
                    ("latest_chapter".to_string(), latest_chapter),
                    ("thumbnail".to_string(), thumbnail),
                    ("page".to_string(), page.to_string()),
                ]));
            }
            page += 1;
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
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
