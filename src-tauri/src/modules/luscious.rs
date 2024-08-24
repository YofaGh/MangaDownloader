use async_trait::async_trait;
use chrono::{NaiveDate, NaiveDateTime};
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

pub struct Luscious {}

#[async_trait]
impl Module for Luscious {
    fn get_type(&self) -> String {
        "Doujin".to_string()
    }
    fn get_domain(&self) -> String {
        "luscious.net".to_string()
    }
    fn get_logo(&self) -> String {
        "https://www.luscious.net/assets/logo.png".to_string()
    }
    fn is_searchable(&self) -> bool {
        true
    }
    fn get_module_sample(&self) -> HashMap<String, String> {
        HashMap::from([
            ("code".to_string(), "505726".to_string()),
            ("keyword".to_string(), "solo".to_string()),
        ])
    }
    async fn download_image(
        &self,
        url: &str,
        image_name: &str,
    ) -> Result<Option<String>, Box<dyn std::error::Error>> {
        let response = Self::send_request(
            &self,
            url,
            "GET",
            Some(Self::get_download_image_headers(&self)),
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
    async fn retrieve_image(&self, url: &str) -> Result<Response, Box<dyn std::error::Error>> {
        Ok(Self::send_request(
            &self,
            &url,
            "GET",
            Some(Self::get_download_image_headers(&self)),
            Some(true),
        )
        .await?)
    }
    async fn get_info(
        &self,
        manga: &str,
    ) -> Result<HashMap<String, Value>, Box<dyn std::error::Error>> {
        let url = format!("https://www.luscious.net/albums/{}", manga);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true)).await?;
        let document: Html = Html::parse_document(&response.text().await?);
        let cover_selector = Selector::parse("div.picture-card-outer img")?;
        let title_selector = Selector::parse("h1.o-h1.album-heading")?;
        let alternative_selector = Selector::parse("div.album-info-wrapper h2")?;
        let info_box_selector = Selector::parse("div.album-info-wrapper")?;
        let album_info_item_selector = Selector::parse("span.album-info-item")?;
        let tag_secondary_selector = Selector::parse("div.o-tag--secondary")?;
        let album_description_selector = Selector::parse("div.album-description")?;
        let language_selector = Selector::parse("a.language_flags-module__link--dp0Rr")?;

        let mut cover = String::new();
        let mut title = String::new();
        let mut alternative = String::new();
        let mut pages = String::new();
        let mut extras: HashMap<&str, Value> = HashMap::new();
        let mut dates = HashMap::new();
        let mut tags = Vec::new();

        if let Some(cover_element) = document.select(&cover_selector).next() {
            cover = cover_element.value().attr("src").unwrap_or("").to_string();
        }

        if let Some(title_element) = document.select(&title_selector).next() {
            title = title_element
                .text()
                .collect::<Vec<_>>()
                .join("")
                .trim()
                .to_string();
        }

        if let Some(alternative_element) = document.select(&alternative_selector).next() {
            alternative = alternative_element
                .text()
                .collect::<Vec<_>>()
                .join("")
                .trim()
                .to_string();
        }

        if let Some(info_box) = document.select(&info_box_selector).next() {
            if let Some(language_element) = info_box.select(&language_selector).next() {
                extras.insert(
                    "Language",
                    to_value(language_element.text().collect::<Vec<_>>().join("").trim())
                        .unwrap_or_default(),
                );
            }

            for box_element in info_box.select(&album_info_item_selector) {
                let text = box_element
                    .text()
                    .collect::<Vec<_>>()
                    .join("")
                    .trim()
                    .to_string();
                if text.contains("pictures") {
                    pages = text.replace(" pictures", "");
                } else {
                    let strong_text = box_element
                        .select(&Selector::parse("strong")?)
                        .next()
                        .unwrap()
                        .text()
                        .collect::<Vec<_>>()
                        .join("")
                        .trim()
                        .to_string();
                    let date_text = box_element
                        .text()
                        .collect::<Vec<_>>()
                        .last()
                        .unwrap()
                        .trim()
                        .to_string();
                    let cleaned_input = date_text
                        .replace("th", "")
                        .replace("st", "")
                        .replace("nd", "")
                        .replace("rd", "");
                    let date = NaiveDate::parse_from_str(&cleaned_input, "%B %d, %Y")?;
                    let datetime =
                        NaiveDateTime::new(date, chrono::NaiveTime::from_hms_opt(0, 0, 0).unwrap());
                    dates.insert(strong_text, datetime.to_string());
                }
            }
            for box_element in info_box.select(&tag_secondary_selector) {
                tags.push(
                    box_element
                        .text()
                        .collect::<Vec<_>>()
                        .join("")
                        .trim()
                        .to_string(),
                );
            }
            if let Some(description_element) = info_box.select(&album_description_selector).next() {
                extras.insert(
                    "Album Description",
                    to_value(
                        description_element
                            .text()
                            .collect::<Vec<_>>()
                            .join("")
                            .trim(),
                    )
                    .unwrap_or_default(),
                );
            }
        }
        extras.insert("Tags", to_value(tags).unwrap_or_default());
        let mut info: HashMap<String, Value> = HashMap::new();
        info.insert("Cover".to_string(), to_value(cover)?);
        info.insert("Title".to_string(), to_value(title)?);
        info.insert("Pages".to_string(), to_value(pages)?);
        info.insert("Alternative".to_string(), to_value(alternative)?);
        info.insert("Extras".to_string(), to_value(extras)?);
        info.insert("Dates".to_string(), to_value(dates)?);
        println!("{:?}", info);
        Ok(info)
    }
    async fn get_chapters(
        &self,
        _: &str,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn std::error::Error>> {
        Ok(Default::default())
    }
    async fn get_images(
        &self,
        manga: &str,
        _: &str,
    ) -> Result<(Vec<String>, Value), Box<dyn std::error::Error>> {
        let data = "https://apicdn.luscious.net/graphql/nobatch/?operationName=PictureListInsideAlbum&query=%2520query%2520PictureListInsideAlbum%28%2524input%253A%2520PictureListInput%21%29%2520%257B%2520picture%2520%257B%2520list%28input%253A%2520%2524input%29%2520%257B%2520info%2520%257B%2520...FacetCollectionInfo%2520%257D%2520items%2520%257B%2520url_to_original%2520position%2520%257B%2520category%2520text%2520url%2520%257D%2520thumbnails%2520%257B%2520width%2520height%2520size%2520url%2520%257D%2520%257D%2520%257D%2520%257D%2520%257D%2520fragment%2520FacetCollectionInfo%2520on%2520FacetCollectionInfo%2520%257B%2520page%2520total_pages%2520%257D%2520&variables=%7B%22input%22%3A%7B%22filters%22%3A%5B%7B%22name%22%3A%22album_id%22%2C%22value%22%3A%22__album__id__%22%7D%5D%2C%22display%22%3A%22position%22%2C%22items_per_page%22%3A50%2C%22page%22%3A__page__number__%7D%7D";
        let url = data
            .replace("__album__id__", manga)
            .replace("__page__number__", "1");
        let response: Value = Self::send_request(&self, &url, "GET", None, Some(true))
            .await?
            .json()
            .await?;
        let total_pages = response["data"]["picture"]["list"]["info"]["total_pages"]
            .as_i64()
            .unwrap_or(1);
        let mut images = response["data"]["picture"]["list"]["items"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|item| item["url_to_original"].as_str().unwrap_or("").to_string())
            .collect::<Vec<_>>();
        for page in 2..=total_pages {
            let url = data
                .replace("__album__id__", manga)
                .replace("__page__number__", &page.to_string());
            let response: Value = Self::send_request(&self, &url, "GET", None, Some(true))
                .await?
                .json()
                .await?;
            let new_images = response["data"]["picture"]["list"]["items"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|item| item["url_to_original"].as_str().unwrap_or("").to_string())
                .collect::<Vec<_>>();
            images.extend(new_images);
        }
        Ok((images, to_value(false).unwrap_or_default()))
    }
    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn std::error::Error>> {
        let data = "https://apicdn.luscious.net/graphql/nobatch/?operationName=AlbumList&query=%2520query%2520AlbumList%28%2524input%253A%2520AlbumListInput%21%29%2520%257B%2520album%2520%257B%2520list%28input%253A%2520%2524input%29%2520%257B%2520info%2520%257B%2520...FacetCollectionInfo%2520%257D%2520items%2520%257B%2520...AlbumInSearchList%2520%257D%2520%257D%2520%257D%2520%257D%2520fragment%2520FacetCollectionInfo%2520on%2520FacetCollectionInfo%2520%257B%2520total_pages%2520%257D%2520fragment%2520AlbumInSearchList%2520on%2520Album%2520%257B%2520__typename%2520id%2520title%2520%257D%2520&variables=%7B%22input%22%3A%7B%22items_per_page%22%3A30%2C%22display%22%3A%22search_score%22%2C%22filters%22%3A%5B%7B%22name%22%3A%22album_type%22%2C%22value%22%3A%22manga%22%7D%2C%7B%22name%22%3A%22audience_ids%22%2C%22value%22%3A%22%2B1%2B3%2B5%22%7D%2C%7B%22name%22%3A%22language_ids%22%2C%22value%22%3A%22%2B1%2B100%2B101%2B2%2B3%2B4%2B5%2B6%2B8%2B9%2B99%22%7D%2C%7B%22name%22%3A%22search_query%22%2C%22value%22%3A%22__keyword__%22%7D%5D%2C%22page%22%3A__page__number__%7D%7D";
        let mut total_pages = 1000;
        let mut page = 1;
        let mut results: Vec<HashMap<String, String>> = Vec::new();
        while page <= page_limit {
            if page > total_pages {
                return Ok(results);
            }
            let url = data
                .replace("__keyword__", &keyword)
                .replace("__page__number__", &page.to_string());
            let response: Value = Self::send_request(&self, &url, "GET", None, Some(true))
                .await?
                .json()
                .await?;
            total_pages = response["data"]["album"]["list"]["info"]["total_pages"]
                .as_i64()
                .unwrap_or(1000) as u32;
            let doujins = response["data"]["album"]["list"]["items"]
                .as_array()
                .unwrap();

            for doujin in doujins {
                let tags = doujin["tags"]
                    .as_array()
                    .unwrap_or(&vec![])
                    .iter()
                    .map(|tag| tag["text"].as_str().unwrap_or("").to_string())
                    .collect::<Vec<_>>()
                    .join(", ");
                let genres = doujin["genres"]
                    .as_array()
                    .unwrap_or(&vec![])
                    .iter()
                    .map(|genre| genre["title"].as_str().unwrap_or("").to_string())
                    .collect::<Vec<_>>()
                    .join(", ");
                let title = doujin["title"].as_str().unwrap_or("").to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }

                results.push(HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), "luscious.net".to_string()),
                    (
                        "code".to_string(),
                        doujin["id"].as_str().unwrap_or("").to_string(),
                    ),
                    (
                        "thumbnail".to_string(),
                        doujin["cover"]["url"].as_str().unwrap_or("").to_string(),
                    ),
                    ("tags".to_string(), tags),
                    ("genres".to_string(), genres),
                    ("page".to_string(), page.to_string()),
                ]));
            }
            page += 1;
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
        }
        println!("{:?}", results);
        Ok(results)
    }
}
impl Luscious {
    pub fn new() -> Luscious {
        Luscious {}
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
