use async_trait::async_trait;
use futures::stream::TryStreamExt;
use futures::Future;
use reqwest::{
    header::{HeaderName, HeaderValue},
    Client, Error, Method, RequestBuilder, Response,
};
use serde_json::{to_value, Value};
use std::collections::HashMap;
use tokio::fs::File;
use tokio::io::{self, AsyncWriteExt};
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
        let url = format!("https://cubari.moe/read/api/nhentai/series/{}/", code);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let response: Value = response.json().await.unwrap();
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
        info.insert("Extras".to_string(), to_value(extras).unwrap());
        info
    }

    async fn get_images(&self, code: &str, _: &str) -> (Vec<String>, Value) {
        let url = format!("https://cubari.moe/read/api/nhentai/series/{}/", code);
        let response: Response = Self::send_request(&self, &url, "GET", None, Some(true))
            .await
            .unwrap();
        let response: Value = response.json().await.unwrap();
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
        (
            images[0]
                .as_array()
                .unwrap()
                .into_iter()
                .enumerate()
                .map(|(_, image)| image.as_str().unwrap().to_string())
                .collect(),
            Value::Bool(false),
        )
    }
    async fn get_chapters(&self, _: &str) -> Vec<HashMap<String, String>> {
        Default::default()
    }
    async fn search_by_keyword(
        &self,
        _: String,
        _: bool,
        _: f64,
        _: u32,
    ) -> Vec<HashMap<String, String>> {
        Vec::<HashMap<String, String>>::new()
    }
}

impl Nhentai {
    pub fn new() -> Nhentai {
        Nhentai {}
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