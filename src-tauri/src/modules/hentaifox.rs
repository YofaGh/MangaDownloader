use async_trait::async_trait;
use futures::stream::TryStreamExt;
use futures::Future;
use reqwest::{
    header::{HeaderName, HeaderValue},
    Client, Error, Method, RequestBuilder, Response,
};
use scraper::{selectable::Selectable, ElementRef, Html, Selector};
use serde_json::{to_value, Value};
use std::{collections::HashMap, thread, time::Duration};
use tokio::fs::File;
use tokio::io::{self, AsyncWriteExt};
use tokio_util::io::StreamReader;

use crate::models::Module;

pub struct Hentaifox {}

#[async_trait]
impl Module for Hentaifox {
    fn get_type(&self) -> String {
        "Doujin".to_string()
    }
    fn get_domain(&self) -> String {
        "hentaifox.com".to_string()
    }
    fn get_logo(&self) -> String {
        "https://hentaifox.com/images/logo.png".to_string()
    }
    fn is_searchable(&self) -> bool {
        true
    }
    fn is_coded(&self) -> bool {
        true
    }
    fn get_module_sample(&self) -> HashMap<String, String> {
        HashMap::from([("code".to_string(), "1".to_string())])
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
    async fn get_info(&self, code: &str) -> HashMap<String, Value> {
        let url: String = format!("https://hentaifox.com/gallery/{}", code);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let document: Html = Html::parse_document(&response.text().await.unwrap());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        let info_selector: Selector = Selector::parse("div.info").unwrap();
        let cover_selector: Selector = Selector::parse("div.cover img").unwrap();
        let h1_selector: Selector = Selector::parse("div.info h1").unwrap();
        let cover: String = document
            .select(&cover_selector)
            .next()
            .map(|n: ElementRef| n.value().attr("data-cfsrc").unwrap_or("").to_string())
            .unwrap_or_default();
        let title: String = document
            .select(&h1_selector)
            .next()
            .map(|n: ElementRef| n.text().collect::<Vec<_>>().join(""))
            .unwrap_or_default();
        let info_box: ElementRef = document.select(&info_selector).next().unwrap();
        info.insert("Cover".to_string(), to_value(cover).unwrap());
        info.insert("Title".to_string(), to_value(title).unwrap());
        if let Some(posted) = info_box
            .select(&Selector::parse("span").unwrap())
            .filter(|e: &ElementRef| {
                e.text()
                    .collect::<Vec<_>>()
                    .join("")
                    .trim()
                    .to_string()
                    .contains("Posted")
            })
            .next()
        {
            info.insert(
                "Posted".to_string(),
                to_value(
                    posted
                        .text()
                        .collect::<Vec<_>>()
                        .join("")
                        .replace("Posted: ", ""),
                )
                .unwrap(),
            );
        }
        if let Some(pages) = info_box
            .select(&Selector::parse("span").unwrap())
            .filter(|e| {
                e.text()
                    .collect::<Vec<_>>()
                    .join("")
                    .trim()
                    .to_string()
                    .contains("Pages")
            })
            .next()
        {
            info.insert(
                "Pages".to_string(),
                to_value(
                    pages
                        .text()
                        .collect::<Vec<_>>()
                        .join("")
                        .replace("Pages: ", ""),
                )
                .unwrap(),
            );
        }
        for box_item in info_box.select(&Selector::parse("ul:not(.g_buttons)").unwrap()) {
            if let Some(span) = box_item.select(&Selector::parse("span").unwrap()).next() {
                let key: String = span
                    .text()
                    .collect::<Vec<_>>()
                    .join("")
                    .trim_end_matches(':')
                    .to_string();
                let values: Vec<String> = box_item
                    .select(&Selector::parse("a").unwrap())
                    .map(|a: ElementRef| a.text().collect::<Vec<_>>()[0].trim().to_string())
                    .collect::<Vec<_>>();
                extras.insert(key, to_value(values).unwrap());
            }
        }
        info.insert("Extras".to_string(), to_value(extras).unwrap());
        info
    }

    async fn get_images(&self, code: &str, _: &str) -> (Vec<String>, Value) {
        const IMAGE_FORMATS: &'static [(&'static str, &'static str)] =
            &[("j", "jpg"), ("p", "png"), ("b", "bmp"), ("g", "gif")];
        let url: String = format!("https://hentaifox.com/gallery/{}", code);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let document: Html = Html::parse_document(&response.text().await.unwrap());
        let thumb_selector: Selector = Selector::parse("div.gallery_thumb img").unwrap();
        let script_selector: Selector = Selector::parse("script").unwrap();
        let path: &str = document
            .select(&thumb_selector)
            .next()
            .and_then(|img| img.value().attr("data-src"))
            .unwrap_or_default();
        let slashed: Vec<&str> = path.split("/").collect();
        let path: &str = path.split_at(path.len() - slashed.last().unwrap().len()).0;
        let script: String = document
            .select(&script_selector)
            .find(|script: &ElementRef| script.text().any(|t| t.contains("var g_th")))
            .map(|script: ElementRef| script.text().collect::<Vec<_>>().join(""))
            .unwrap();
        let json_str: String = script
            .replace("var g_th = $.parseJSON('", "")
            .replace("');", "")
            .to_string();
        let images: HashMap<String, String> = serde_json::from_str(&json_str).unwrap();
        let image_urls: Vec<String> = images
            .iter()
            .map(|(key, value)| {
                let format: &str = IMAGE_FORMATS
                    .iter()
                    .find(|&&(k, _)| k == value.split(",").next().unwrap_or(""))
                    .map(|&(_, v)| v)
                    .unwrap_or("jpg");
                format!("{}{}.{}", path, key, format)
            })
            .collect();

        (image_urls, Value::Bool(false))
    }
    async fn get_chapters(&self, _: &str) -> Vec<HashMap<String, String>> {
        Default::default()
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
        while page <= page_limit {
            let response: Response = Self::send_request(
                &self,
                &format!("https://hentaifox.com/search/?q={}&page={}", keyword, page),
                "GET",
                None,
                Some(true),
            )
            .await
            .unwrap();
            if response.status().is_success() {
                let body: String = response.text().await.unwrap();
                let document: Html = Html::parse_document(&body);
                let thumb_selector = Selector::parse("div.thumb").unwrap();
                let doujins = document.select(&thumb_selector).collect::<Vec<_>>();
                if doujins.is_empty() {
                    break;
                }
                for doujin in doujins {
                    let caption_selector: Selector = Selector::parse("div.caption a").unwrap();
                    let category_selector: Selector = Selector::parse("a.t_cat").unwrap();
                    let img_selector: Selector = Selector::parse("img").unwrap();

                    let caption: ElementRef = doujin.select(&caption_selector).next().unwrap();
                    let title: String = caption.text().collect::<Vec<_>>().join("");
                    if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                        continue;
                    }
                    results.push(HashMap::from([
                        ("name".to_string(), title),
                        ("domain".to_string(), "hentaifox.com".to_string()),
                        (
                            "code".to_string(),
                            caption
                                .value()
                                .attr("href")
                                .unwrap_or("")
                                .split('/')
                                .nth(2)
                                .unwrap_or("")
                                .to_string(),
                        ),
                        (
                            "thumbnail".to_string(),
                            doujin
                                .select(&img_selector)
                                .next()
                                .unwrap()
                                .value()
                                .attr("data-cfsrc")
                                .unwrap_or("")
                                .to_string(),
                        ),
                        (
                            "category".to_string(),
                            doujin
                                .select(&category_selector)
                                .next()
                                .unwrap()
                                .text()
                                .collect::<Vec<_>>()
                                .join(""),
                        ),
                        ("page".to_string(), page.to_string()),
                    ]));
                }
            } else {
                break;
            }
            page += 1;
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
        }
        results
    }
}

impl Hentaifox {
    pub fn new() -> Hentaifox {
        Hentaifox {}
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