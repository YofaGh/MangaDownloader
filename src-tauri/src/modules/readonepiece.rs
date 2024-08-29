use async_trait::async_trait;
use reqwest::Response;
use scraper::{Html, Selector};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error};

use crate::models::{BaseModule, Module};

pub struct Readonepiece {
    base: BaseModule,
}

#[async_trait]
impl Module for Readonepiece {
    fn base(&self) -> &BaseModule {
        &self.base
    }

    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{}/", manga);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Html = Html::parse_document(&response.text().await?);
        let cover_selector: Selector = Selector::parse("div.py-4.px-6.mb-3 img")?;
        let title_selector: Selector = Selector::parse("h1.my-3.font-bold.text-2xl.md\\:text-3xl")?;
        let summary_selector: Selector = Selector::parse("div.py-4.px-6.mb-3 div.text-text-muted")?;
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
        Ok(info)
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url: String = format!("https://ww9.readonepiece.com/chapter/{}-{}", manga, chapter);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Html = Html::parse_document(&response.text().await?);
        let image_selector: Selector = Selector::parse("img.mb-3.mx-auto.js-page")?;
        let images: Vec<String> = document
            .select(&image_selector)
            .map(|img| img.value().attr("src").unwrap().to_string())
            .collect();
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(
        &self,
        manga: String,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{}/", manga);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Html = Html::parse_document(&response.text().await?);
        let chapter_selector: Selector =
            Selector::parse("div.bg-bg-secondary.p-3.rounded.mb-3.shadow a")?;
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
            chapter_info.insert("name".to_string(), self.rename_chapter(chapter_url));
            chapters.push(chapter_info);
        }
        Ok(chapters)
    }
}

impl Readonepiece {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "readonepiece.com",
                logo: "https://ww9.readonepiece.com/apple-touch-icon.png",
                sample: HashMap::from([("manga", "one-piece-digital-colored-comics")]),
                ..BaseModule::default()
            },
        }
    }
}
