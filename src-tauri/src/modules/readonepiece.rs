use async_trait::async_trait;
use futures::stream::TryStreamExt;
use reqwest::Response;
use scraper::{Html, Selector};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error};
use tokio::{
    fs::File,
    io::{self, AsyncWriteExt},
};
use tokio_util::io::StreamReader;

use crate::models::Module;

pub struct Readonepiece {}

#[async_trait]
impl Module for Readonepiece {
    fn get_type(&self) -> String {
        "Manga".to_string()
    }
    fn get_domain(&self) -> String {
        "readonepiece.com".to_string()
    }
    fn get_logo(&self) -> String {
        "https://ww9.readonepiece.com/apple-touch-icon.png".to_string()
    }
    fn get_module_sample(&self) -> HashMap<String, String> {
        HashMap::from([(
            "manga".to_string(),
            "one-piece-digital-colored-comics".to_string(),
        )])
    }
    async fn download_image(
        &self,
        url: &str,
        image_name: &str,
    ) -> Result<Option<String>, Box<dyn Error>> {
        let response = self
            .send_request(
                url,
                "GET",
                Some(self.get_download_image_headers()),
                Some(true),
            )
            .await?;
        let stream = response
            .bytes_stream()
            .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()));
        let mut reader = StreamReader::new(stream);
        let mut file: File = File::create(image_name).await?;
        tokio::io::copy(&mut reader, &mut file).await?;
        file.flush().await.ok().unwrap();
        Ok(Some(image_name.to_string()))
    }
    async fn get_info(&self, manga: &str) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{}/", manga);
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
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
        manga: &str,
        chapter: &str,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url: String = format!("https://ww9.readonepiece.com/chapter/{}-{}", manga, chapter);
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
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
        manga: &str,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{}/", manga);
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
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
            chapter_info.insert("name".to_string(), self.rename_chapter(&chapter_url));
            chapters.push(chapter_info);
        }
        Ok(chapters)
    }
    async fn search_by_keyword(
        &self,
        _: String,
        _: bool,
        _: f64,
        _: u32,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        Ok(Vec::<HashMap<String, String>>::new())
    }
}

impl Readonepiece {
    pub fn new() -> Readonepiece {
        Readonepiece {}
    }
}
