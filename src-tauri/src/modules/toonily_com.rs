use async_trait::async_trait;
use futures::stream::TryStreamExt;
use futures::Future;
use reqwest::{
    header::{HeaderName, HeaderValue},
    Client, Error, Method, RequestBuilder, Response,
};
use scraper::{html::Select, ElementRef, Html, Selector};
use serde_json::{to_value, Value};
use std::{collections::HashMap, thread, time::Duration};
use tokio::fs::File;
use tokio::io::{self, AsyncWriteExt};
use tokio_util::io::StreamReader;

use crate::models::Module;

pub struct Toonily {}

#[async_trait]
impl Module for Toonily {
    fn get_type(&self) -> String {
        "Manga".to_string()
    }
    fn get_domain(&self) -> String {
        "toonily.com".to_string()
    }
    fn get_logo(&self) -> String {
        "https://toonily.com/wp-content/uploads/2020/01/cropped-toonfavicon-1-192x192.png"
            .to_string()
    }
    fn is_searchable(&self) -> bool {
        true
    }
    fn get_download_image_headers(&self) -> HashMap<&'static str, &'static str> {
        HashMap::from([("Referer", "https://toonily.com/")])
    }
    fn get_module_sample(&self) -> HashMap<String, String> {
        HashMap::from([("manga".to_string(), "peerless-dad".to_string())])
    }
    async fn download_image(&self, url: &str, image_name: &str) -> Option<String> {
        match Self::send_request(
            &self,
            url,
            "GET",
            Some(Self::get_download_image_headers(&self)),
            Some(true),
        )
        .await
        {
            Ok(response) => {
                let stream = response
                    .bytes_stream()
                    .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()));
                let mut reader = StreamReader::new(stream);
                let mut file: File = match File::create(image_name).await {
                    Ok(file) => file,
                    Err(_) => return None,
                };
                match tokio::io::copy(&mut reader, &mut file).await {
                    Ok(_) => {
                        file.flush().await.ok()?;
                        Some(image_name.to_string())
                    }
                    Err(_) => None,
                }
            }
            Err(_) => None,
        }
    }
    async fn retrieve_image(&self, url: &str) -> Response {
        Self::send_request(
            &self,
            &url,
            "GET",
            Some(Self::get_download_image_headers(&self)),
            Some(true),
        )
        .await
        .unwrap()
    }
    async fn get_info(&self, manga: &str) -> HashMap<String, Value> {
        let url: String = format!("https://toonily.com/webtoon/{}/", manga);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let document: Html = Html::parse_document(&response.text().await.unwrap());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<&str, Value> = HashMap::new();
        let info_box: ElementRef = document
            .select(&Selector::parse("div.tab-summary").unwrap())
            .next()
            .unwrap();
        if let Some(element) = info_box.select(&Selector::parse("img").unwrap()).next() {
            info.insert(
                "Cover".to_owned(),
                to_value(element.value().attr("data-src").unwrap_or("")).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .select(&Selector::parse("div.post-title h1").unwrap())
            .next()
        {
            info.insert(
                "Title".to_owned(),
                to_value(element.text().collect::<Vec<_>>().join("").trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .select(&Selector::parse("div.summary__content").unwrap())
            .next()
        {
            info.insert(
                "Summary".to_owned(),
                to_value(element.text().collect::<Vec<_>>().join("").trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .select(&Selector::parse("span#averagerate").unwrap())
            .next()
        {
            info.insert(
                "Rating".to_owned(),
                to_value(
                    element
                        .text()
                        .collect::<Vec<_>>()
                        .join("")
                        .trim()
                        .parse::<f64>()
                        .unwrap_or(0.0),
                )
                .unwrap_or_default(),
            );
        }
        let tags: Vec<String> = document
            .select(&Selector::parse("div.wp-manga-tags-list a").unwrap())
            .map(|tag| {
                tag.text()
                    .collect::<Vec<_>>()
                    .join("")
                    .trim()
                    .replace('#', "")
            })
            .collect::<Vec<_>>();
        extras.insert("Tags", to_value(tags).unwrap());
        let manga_info_row: ElementRef = document
            .select(&Selector::parse("div.manga-info-row").unwrap())
            .next()
            .unwrap();
        let box_selector: Selector = Selector::parse("div.post-content_item").unwrap();
        for box_elem in manga_info_row.select(&box_selector) {
            let box_str: String = box_elem.text().collect::<Vec<_>>().join("");
            let content: &str = box_str.trim();
            if content.contains("Alt Name") {
                info.insert(
                    "Alternative".to_string(),
                    to_value(
                        box_elem
                            .select(&Selector::parse("div.summary-content").unwrap())
                            .next()
                            .unwrap()
                            .text()
                            .collect::<Vec<_>>()
                            .join("")
                            .trim(),
                    )
                    .unwrap(),
                );
            } else if content.contains("Author") {
                extras.insert(
                    "Authors",
                    to_value(
                        box_elem
                            .select(&Selector::parse("a").unwrap())
                            .map(|a| a.text().collect::<Vec<_>>().join(""))
                            .collect::<Vec<_>>(),
                    )
                    .unwrap(),
                );
            } else if content.contains("Artist") {
                extras.insert(
                    "Artists",
                    to_value(
                        box_elem
                            .select(&Selector::parse("a").unwrap())
                            .map(|a| a.text().collect::<Vec<_>>().join(""))
                            .collect::<Vec<_>>(),
                    )
                    .unwrap(),
                );
            } else if content.contains("Genre") {
                extras.insert(
                    "Genres",
                    to_value(
                        box_elem
                            .select(&Selector::parse("a").unwrap())
                            .map(|a| a.text().collect::<Vec<_>>().join(""))
                            .collect::<Vec<_>>(),
                    )
                    .unwrap(),
                );
            }
        }
        info.insert("Extras".to_string(), to_value(extras).unwrap());
        info
    }

    async fn get_chapters(&self, manga: &str) -> Vec<HashMap<String, String>> {
        let url: String = format!("https://toonily.com/webtoon/{}/", manga);
        let resp: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let body: String = resp.text().await.unwrap();
        let document: Html = Html::parse_document(&body);
        let chapters: Vec<HashMap<String, String>> = document
            .select(&Selector::parse("li.wp-manga-chapter").unwrap())
            .rev()
            .map(|div: ElementRef| {
                let chapter_url: String = div
                    .select(&Selector::parse("a").unwrap())
                    .next()
                    .unwrap()
                    .value()
                    .attr("href")
                    .unwrap()
                    .split('/')
                    .nth_back(1)
                    .unwrap()
                    .to_string();
                HashMap::from([
                    ("url".to_string(), chapter_url.clone()),
                    (
                        "name".to_string(),
                        Self::rename_chapter(&self, &chapter_url),
                    ),
                ])
            })
            .collect::<Vec<_>>();
        chapters
    }

    async fn get_images(&self, manga: &str, chapter: &str) -> (Vec<String>, Value) {
        let url: String = format!("https://toonily.com/webtoon/{}/{}//", manga, chapter);
        let resp: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let body: String = resp.text().await.unwrap();
        let document: Html = Html::parse_document(&body);
        let images: Vec<String> = document
            .select(&Selector::parse("div.reading-content img").unwrap())
            .map(|img| img.value().attr("data-src").unwrap().trim().to_string())
            .collect::<Vec<_>>();
        let save_names: Vec<String> = images
            .iter()
            .enumerate()
            .map(|(i, img)| format!("{:03}.{}", i + 1, img.split('.').last().unwrap()))
            .collect::<Vec<_>>();
        (images, to_value(save_names).unwrap())
    }
    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Vec<HashMap<String, String>> {
        let mut results: Vec<HashMap<String, String>> = Vec::new();
        let mut page: u32 = 1;
        let search_headers: HashMap<&str, &str> = HashMap::from([("cookie", "toonily-mature=1")]);
        while page <= page_limit {
            let url: String = format!("https://toonily.com/search/{}/page/{}/", keyword, page);
            let resp: Response =
                Self::send_request(&self, &url, "GET", Some(search_headers.clone()), Some(true))
                    .await
                    .unwrap();
            let body: String = resp.text().await.unwrap();
            let document: Html = Html::parse_document(&body);
            let manga_selector: Selector = Selector::parse("div.col-6 col-sm-3 col-lg-2").unwrap();
            let mangas: Select = document.select(&manga_selector);
            for manga in mangas {
                let details: ElementRef = manga
                    .select(&Selector::parse("div.post-title font-title").unwrap())
                    .next()
                    .unwrap();
                let title: String = details
                    .text()
                    .collect::<Vec<_>>()
                    .join("")
                    .trim()
                    .to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let url_selector: Selector = Selector::parse("a").unwrap();
                let url: String = details
                    .select(&url_selector)
                    .next()
                    .unwrap()
                    .value()
                    .attr("href")
                    .unwrap()
                    .split('/')
                    .nth_back(1)
                    .unwrap()
                    .to_string();
                let thumbnail_selector: Selector = Selector::parse("img").unwrap();
                let thumbnail: String = details
                    .select(&thumbnail_selector)
                    .next()
                    .unwrap()
                    .value()
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
        results
    }
}
impl Toonily {
    pub fn new() -> Toonily {
        Toonily {}
    }
    pub fn send_request(
        &self,
        url: &str,
        method: &str,
        headers: Option<HashMap<&str, &str>>,
        verify: Option<bool>,
    ) -> impl Future<Output = Result<Response, Error>> {
        let client: Client = Client::builder()
            .danger_accept_invalid_certs(verify.unwrap_or(true))
            .build()
            .unwrap();
        let request: RequestBuilder =
            client.request(Method::from_bytes(method.as_bytes()).unwrap(), url);
        let request: RequestBuilder = match headers {
            Some(h) => request.headers(
                h.into_iter()
                    .map(|(k, v)| {
                        (
                            HeaderName::from_bytes(k.as_bytes()).unwrap(),
                            HeaderValue::from_str(v).unwrap(),
                        )
                    })
                    .collect(),
            ),
            None => request,
        };
        request.send()
    }
}