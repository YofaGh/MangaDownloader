use async_trait::async_trait;
use futures::stream::TryStreamExt;
use reqwest::Response;
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error};
use tokio::{
    fs::File,
    io::{self, AsyncWriteExt},
};
use tokio_util::io::StreamReader;

use crate::models::Module;

pub struct Nhentai {}

#[async_trait]
impl Module for Nhentai {
    fn get_type(&self) -> String {
        "Doujin".to_string()
    }
    fn get_domain(&self) -> String {
        "nhentai.net".to_string()
    }
    fn get_logo(&self) -> String {
        "https://static.nhentai.net/img/logo.090da3be7b51.svg".to_string()
    }
    fn is_coded(&self) -> bool {
        true
    }
    fn get_module_sample(&self) -> HashMap<String, String> {
        HashMap::from([("code".to_string(), "2".to_string())])
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
    async fn get_info(&self, code: &str) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url = format!("https://cubari.moe/read/api/nhentai/series/{}/", code);
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
        let response: Value = response.json().await?;
        let mut info: HashMap<String, Value> = HashMap::new();
        let images: Vec<Value> = response["chapters"]
            .as_object()
            .unwrap()
            .values()
            .next()
            .unwrap()["groups"]
            .as_object()
            .unwrap()
            .values()
            .cloned()
            .collect();
        info.insert("Cover".to_string(), response["cover"].clone());
        info.insert("Title".to_string(), response["title"].clone());
        info.insert(
            "Pages".to_string(),
            Value::from(images[0].as_array().unwrap().len()),
        );
        let mut extras: HashMap<&str, Value> = HashMap::new();
        extras.insert("Artists", response["artist"].clone());
        extras.insert("Authors", response["author"].clone());
        extras.insert(
            "Groups",
            Value::from(
                response["groups"]
                    .as_object()
                    .unwrap()
                    .values()
                    .cloned()
                    .collect::<Vec<Value>>(),
            ),
        );
        extras.insert("Description", response["description"].clone());
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(
        &self,
        code: &str,
        _: &str,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url = format!("https://cubari.moe/read/api/nhentai/series/{}/", code);
        let response: Response = self.send_request(&url, "GET", None, Some(true)).await?;
        let response: Value = response.json().await?;
        let images: Vec<Value> = response["chapters"]
            .as_object()
            .unwrap()
            .values()
            .next()
            .unwrap()["groups"]
            .as_object()
            .unwrap()
            .values()
            .cloned()
            .collect();
        Ok((
            images[0]
                .as_array()
                .unwrap()
                .into_iter()
                .enumerate()
                .map(|(_, image)| image.as_str().unwrap().to_string())
                .collect(),
            Value::Bool(false),
        ))
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

impl Nhentai {
    pub fn new() -> Nhentai {
        Nhentai {}
    }
}
