use reqwest::Response;
use scraper::{Html, Selector};
use serde_json::{to_value, Value};
use std::collections::HashMap;

use crate::models::Module;

pub struct Readonepiece {
    pub mtype: String,
    pub logo: String,
    pub domain: String,
    pub download_images_headers: Option<HashMap<&'static str, &'static str>>,
    pub searchable: bool,
}

impl Module for Readonepiece {
    async fn get_info(&self, manga: &str) -> HashMap<String, Value> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{}/", manga);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let document: Html = Html::parse_document(&response.text().await.unwrap());
        let cover_selector: Selector = Selector::parse("div.py-4.px-6.mb-3 img").unwrap();
        let title_selector: Selector =
            Selector::parse("h1.my-3.font-bold.text-2xl.md\\:text-3xl").unwrap();
        let summary_selector: Selector =
            Selector::parse("div.py-4.px-6.mb-3 div.text-text-muted").unwrap();
        let cover: String = document
            .select(&cover_selector)
            .next()
            .unwrap()
            .value()
            .attr("src")
            .unwrap()
            .to_string();
        let title: String = document
            .select(&title_selector)
            .next()
            .unwrap()
            .text()
            .collect::<Vec<_>>()
            .concat();
        let summary: String = document
            .select(&summary_selector)
            .next()
            .unwrap()
            .text()
            .collect::<Vec<_>>()
            .concat();
        let mut info: HashMap<String, Value> = HashMap::new();
        info.insert("Cover".to_string(), to_value(cover).unwrap_or_default());
        info.insert("Title".to_string(), to_value(title).unwrap_or_default());
        info.insert("Summary".to_string(), to_value(summary).unwrap_or_default());
        info
    }

    async fn get_images(&self, manga: &str, chapter: &str) -> (Vec<String>, Value) {
        let url: String = format!("https://ww9.readonepiece.com/chapter/{}-{}", manga, chapter);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let document: Html = Html::parse_document(&response.text().await.unwrap());
        let image_selector: Selector = Selector::parse("img.mb-3.mx-auto.js-page").unwrap();
        let images: Vec<String> = document
            .select(&image_selector)
            .map(|img| img.value().attr("src").unwrap().to_string())
            .collect();
        (images, Value::Bool(false))
    }
    async fn get_chapters(&self, manga: &str) -> Vec<HashMap<String, String>> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{}/", manga);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let document: Html = Html::parse_document(&response.text().await.unwrap());
        let chapter_selector: Selector =
            Selector::parse("div.bg-bg-secondary.p-3.rounded.mb-3.shadow a").unwrap();
        let mut chapters: Vec<HashMap<String, String>> = Vec::new();
        for element in document.select(&chapter_selector).rev() {
            let mut v: Vec<&str> = element
                .value()
                .attr("href")
                .unwrap_or("")
                .split("/")
                .collect();
            v.pop();
            let chapter_url: String = v.pop().unwrap_or("").replace(&format!("{}-", manga), "");
            let mut chapter_info = HashMap::new();
            chapter_info.insert("url".to_string(), chapter_url.clone());
            chapter_info.insert(
                "name".to_string(),
                Self::rename_chapter(&self, &chapter_url),
            );
            chapters.push(chapter_info);
        }
        chapters
    }
}

impl Readonepiece {
    pub fn new() -> Readonepiece {
        Readonepiece {
            mtype: "Manga".to_string(),
            logo: "https://ww9.readonepiece.com/apple-touch-icon.png".to_string(),
            domain: "readonepiece.com".to_string(),
            download_images_headers: None,
            searchable: false,
        }
    }
}