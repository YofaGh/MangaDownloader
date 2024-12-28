use async_trait::async_trait;
use reqwest::header::HeaderMap;
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

pub struct Readonepiece {
    base: BaseModule,
}

#[async_trait]
impl Module for Readonepiece {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        if let Some(element) = document
            .find(Name("div").and(Attr("class", "py-4 px-6 mb-3")))
            .next()
        {
            if let Some(element) = element.find(Name("img")).next() {
                info.insert(
                    "Cover".to_string(),
                    to_value(element.attr("src").unwrap_or("")).unwrap_or_default(),
                );
            }
            if let Some(element) = element
                .find(Name("div").and(Class("text-text-muted")))
                .next()
            {
                info.insert(
                    "Summary".to_string(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
        }
        if let Some(element) = document
            .find(Name("h1").and(Attr("class", "my-3 font-bold text-2xl md:text-3xl")))
            .next()
        {
            info.insert(
                "Title".to_string(),
                to_value(element.text().trim()).unwrap_or_default(),
            );
        }
        Ok(info)
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), AppError> {
        let url: String = format!("https://ww9.readonepiece.com/chapter/{manga}-{chapter}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Name("img").and(Attr("class", "mb-3 mx-auto js-page")))
            .map(|image| image.attr("src").unwrap_or("").to_string())
            .collect();
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(
        &self,
        manga: String,
    ) -> Result<Vec<HashMap<String, String>>, AppError> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let chapters: Vec<HashMap<String, String>> = document
            .find(Name("div").and(Attr("class", "bg-bg-secondary p-3 rounded mb-3 shadow")))
            .map(|div: Node| {
                let group: Vec<&str> = div
                    .find(Name("a"))
                    .next()
                    .unwrap()
                    .attr("href")
                    .unwrap()
                    .rsplit('/')
                    .collect();
                let binding: String = group[1].replace(&format!("{manga}-"), "");
                let chapter: &str = binding.as_str();
                HashMap::from([
                    ("url".to_string(), chapter.to_string()),
                    ("name".to_string(), self.rename_chapter(chapter.to_string())),
                ])
            })
            .collect();
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
                download_image_headers: HeaderMap::new(),
                sample: HashMap::from([("manga", "one-piece-digital-colored-comics")]),
                ..BaseModule::default()
            },
        }
    }
}
