use async_trait::async_trait;
use reqwest::Response;
use scraper::{html::Select, ElementRef, Html, Selector};
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
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
        let document: Html = Html::parse_document(&response.text().await?);
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<&str, Value> = HashMap::new();
        let mut dates: HashMap<&str, Value> = HashMap::new();
        let info_box: Option<scraper::ElementRef> = document
            .select(&Selector::parse("div.tsinfo.bixbox")?)
            .next();
        if let Some(element) = document
            .select(&Selector::parse("img.wp-post-image")?)
            .next()
        {
            info.insert(
                "Cover".to_owned(),
                to_value(element.value().attr("src").unwrap_or("")).unwrap_or_default(),
            );
        }
        if let Some(element) = document.select(&Selector::parse("h1.entry-title")?).next() {
            info.insert(
                "Title".to_owned(),
                to_value(element.text().collect::<Vec<_>>().join(" ").trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .select(&Selector::parse("span.alternative")?)
            .next()
        {
            info.insert(
                "Alternative".to_owned(),
                to_value(
                    element
                        .text()
                        .collect::<Vec<_>>()
                        .join(" ")
                        .trim()
                        .replace("Other Name: ", ""),
                )
                .unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .select(&Selector::parse("div.entry-content.entry-content-single")?)
            .next()
        {
            info.insert(
                "Summary".to_owned(),
                to_value(element.text().collect::<Vec<_>>().join(" ").trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document.select(&Selector::parse("div.detail_rate")?).next() {
            let rating_text: String = element
                .select(&Selector::parse("span")?)
                .next()
                .unwrap()
                .text()
                .collect::<Vec<_>>()
                .join(" ")
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
        if let Some(info_box) = info_box {
            if let Some(element) = info_box.select(&Selector::parse("i")?).next() {
                info.insert(
                    "Status".to_owned(),
                    to_value(element.text().collect::<Vec<_>>().join(" ").trim())
                        .unwrap_or_default(),
                );
            }
            if let Some(element) = info_box.select(&Selector::parse("a")?).next() {
                extras.insert(
                    "Authors",
                    to_value(element.text().collect::<Vec<_>>().join(" ").trim())
                        .unwrap_or_default(),
                );
            }
            if let Some(element) = info_box.select(&Selector::parse("a")?).next() {
                extras.insert(
                    "Artists",
                    to_value(element.text().collect::<Vec<_>>().join(" ").trim())
                        .unwrap_or_default(),
                );
            }
            if let Some(element) = info_box.select(&Selector::parse("time")?).next() {
                dates.insert(
                    "Posted On",
                    to_value(element.value().attr("datetime").unwrap_or("")).unwrap_or_default(),
                );
            }
            if let Some(element) = info_box.select(&Selector::parse("time")?).next() {
                dates.insert(
                    "Updated On",
                    to_value(element.value().attr("datetime").unwrap_or("")).unwrap_or_default(),
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
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
        let document: Html = Html::parse_document(&response.text().await?);
        let images: Vec<String> = document
            .select(&Selector::parse("div#readerarea img")?)
            .filter_map(|img| img.value().attr("src"))
            .map(|src| src.to_string())
            .collect::<Vec<String>>();
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(
        &self,
        manga: String,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        let url: String = format!("https://manhuascan.us/manga/{}", manga);
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
        let document: Html = Html::parse_document(&response.text().await?);
        let binding: Selector = Selector::parse("div.eph-num")?;
        let divs: Select = document.select(&binding);
        let mut chapters: Vec<HashMap<String, String>> = Vec::new();
        for div in divs.rev() {
            if let Some(a) = div.select(&Selector::parse("a")?).next() {
                let chapter_url = a
                    .value()
                    .attr("href")
                    .unwrap_or("")
                    .split('/')
                    .last()
                    .unwrap_or("")
                    .to_string();
                let mut chapter_info: HashMap<String, String> = HashMap::new();
                chapter_info.insert("url".to_owned(), chapter_url.clone());
                chapter_info.insert("name".to_owned(), self.rename_chapter(chapter_url));
                chapters.push(chapter_info);
            }
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
                .send_request(
                    &format!(
                        "https://manhuascan.us/manga-list?search={}&page={}",
                        keyword, page
                    ),
                    "GET",
                    None,
                    Some(true),
                )
                .await?;
            if response.status().is_success() {
                let body: String = response.text().await?;
                let document: Html = Html::parse_document(&body);
                let manga_selector: Selector = Selector::parse("div.bsx")?;
                let mangas: Select = document.select(&manga_selector);
                if mangas.clone().count() == 0 {
                    break;
                }
                for manga in mangas {
                    let title_selector: Selector = Selector::parse("a")?;
                    let title_element: ElementRef = manga.select(&title_selector).next().unwrap();
                    let title: String = title_element
                        .value()
                        .attr("title")
                        .unwrap_or_default()
                        .to_string();
                    if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                        continue;
                    }
                    let latest_chapter_selector: Selector = Selector::parse("div.adds a")?;
                    let latest_chapter: String = manga
                        .select(&latest_chapter_selector)
                        .next()
                        .map_or(String::new(), |a| {
                            a.value()
                                .attr("href")
                                .unwrap_or("")
                                .split('/')
                                .last()
                                .unwrap_or("")
                                .to_string()
                        });
                    let url: String = title_element
                        .value()
                        .attr("href")
                        .unwrap_or("")
                        .split('/')
                        .last()
                        .unwrap_or("")
                        .to_string();
                    let thumbnail_selector: Selector = Selector::parse("img")?;
                    let thumbnail: String = manga
                        .select(&thumbnail_selector)
                        .next()
                        .unwrap()
                        .value()
                        .attr("src")
                        .unwrap_or("")
                        .to_string();
                    results.push(HashMap::from([
                        ("name".to_string(), title),
                        ("domain".to_string(), "manhuascan.us".to_string()),
                        ("url".to_string(), url),
                        ("latest_chapter".to_string(), latest_chapter),
                        ("thumbnail".to_string(), thumbnail),
                        ("page".to_string(), page.to_string()),
                    ]));
                }
            } else {
                break;
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
