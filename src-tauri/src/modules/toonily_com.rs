use crate::models::{BaseModule, Module};
use async_trait::async_trait;
use reqwest::{
    header::{HeaderMap, HeaderValue, COOKIE, REFERER},
    Method, Response,
};
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error, thread, time::Duration};

pub struct Toonily {
    base: BaseModule,
}

#[async_trait]
impl Module for Toonily {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://toonily.com/webtoon/{}/", manga);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        let info_box = document
            .find(Name("div").and(Class("tab-summary")))
            .next()
            .unwrap();
        if let Some(element) = info_box.find(Name("img")).next() {
            info.insert(
                "Cover".to_owned(),
                to_value(element.attr("data-src").unwrap_or("")).unwrap_or_default(),
            );
        }
        if let Some(element) = info_box.find(Name("div").and(Class("post-title"))).next() {
            if let Some(element) = element.find(Name("h1")).next() {
                info.insert(
                    "Title".to_owned(),
                    to_value(element.descendants().next().unwrap().text().trim())
                        .unwrap_or_default(),
                );
            }
        }
        if let Some(element) = document
            .find(Name("div").and(Class("summary__content")))
            .next()
        {
            info.insert(
                "Summary".to_owned(),
                to_value(element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .find(Name("span").and(Attr("id", "averagerate")))
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
                .nth(1)
            {
                info.insert(
                    "Status".to_owned(),
                    to_value(element.text().trim()).unwrap_or_default(),
                );
            }
        }
        if let Some(tags) = document
            .find(Name("div").and(Class("wp-manga-tags-list")))
            .next()
        {
            let tags: Vec<String> = tags
                .find(Name("a"))
                .map(|a| a.text().trim().replace('#', "").to_string())
                .collect();
            extras.insert("Tags".to_string(), to_value(tags).unwrap_or_default());
        }
        let boxes: Vec<Node> = document
            .find(Name("div").and(Class("manga-info-row")))
            .next()
            .unwrap()
            .find(Name("div").and(Class("post-content_item")))
            .collect();
        for box_elem in boxes {
            let box_str: String = box_elem.find(Name("h5")).next().unwrap().text();
            let content: &str = box_str.trim();
            if content.contains("Alt Name") {
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
                extras.insert(
                    box_str.replace("(s)", "s").to_string(),
                    to_value(
                        box_elem
                            .find(Name("a"))
                            .map(|a| a.text())
                            .collect::<Vec<_>>(),
                    )
                    .unwrap_or_default(),
                );
            }
        }
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_chapters(
        &self,
        manga: String,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        let url: String = format!("https://toonily.com/webtoon/{}/", manga);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let chapters: Vec<HashMap<String, String>> = document
            .find(Name("li").and(Class("wp-manga-chapter")))
            .map(|div: Node| {
                let chapter_url: String = div
                    .find(Name("a"))
                    .next()
                    .unwrap()
                    .attr("href")
                    .unwrap()
                    .split('/')
                    .nth_back(1)
                    .unwrap()
                    .to_string();
                HashMap::from([
                    ("url".to_string(), chapter_url.clone()),
                    ("name".to_string(), self.rename_chapter(chapter_url)),
                ])
            })
            .collect();
        Ok(chapters)
    }

    async fn get_images(
        &self,
        manga: String,
        chapter: String,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url: String = format!("https://toonily.com/webtoon/{}/{}/", manga, chapter);
        let response: Response = self.send_simple_request(&url).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Name("div").and(Class("reading-content")))
            .next()
            .unwrap()
            .find(Name("img"))
            .map(|img| img.attr("data-src").unwrap().trim().to_string())
            .collect();
        let save_names: Vec<String> = images
            .iter()
            .enumerate()
            .map(|(i, img)| format!("{:03}.{}", i + 1, img.split('.').last().unwrap()))
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
        let mut search_headers: HeaderMap = HeaderMap::new();
        search_headers.insert(COOKIE, HeaderValue::from_static("toonily-mature=1"));
        while page <= page_limit {
            let url: String = format!("https://toonily.com/search/{}/page/{}/", keyword, page);
            let response: Response = self
                .send_request(&url, Method::GET, search_headers.clone(), Some(true))
                .await?;
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let mangas: Vec<Node> = document
                .find(Name("div").and(Attr("class", "col-6 col-sm-3 col-lg-2")))
                .collect();
            for manga in mangas {
                let details = manga
                    .find(Name("div").and(Attr("class", "post-title font-title")))
                    .next()
                    .unwrap();
                let title: String = details.text().trim().to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let url: String = details
                    .find(Name("a"))
                    .next()
                    .unwrap()
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
                    .attr("data-src")
                    .unwrap_or("")
                    .to_string();
                results.push(HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), "toonily.com".to_string()),
                    ("url".to_string(), url),
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
impl Toonily {
    pub fn new() -> Self {
        let mut download_image_headers: HeaderMap = HeaderMap::new();
        download_image_headers.insert(REFERER, HeaderValue::from_static("https://toonily.com/"));
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "toonily.com",
                logo: "https://toonily.com/wp-content/uploads/2020/01/cropped-toonfavicon-1-192x192.png",
                download_image_headers,
                sample: HashMap::from([("manga", "peerless-dad")]),
                searchable: true,
                ..BaseModule::default()
            },
        }
    }
}
