use async_trait::async_trait;
use base64::{engine::general_purpose, Engine};
use futures::TryStreamExt;
use reqwest::{header::HeaderMap, Client, Error as ReqwestError, Method, RequestBuilder, Response};
use serde_json::Value;
use std::{
    collections::HashMap,
    io::{Error as IoError, ErrorKind as IoErrorKind},
    thread,
    time::Duration,
};
use tokio::{
    fs::File,
    io::{copy, AsyncWriteExt},
};
use tokio_util::{bytes::Bytes, io::StreamReader};

use crate::errors::AppError;

pub struct BaseModule {
    pub type_: &'static str,
    pub domain: &'static str,
    pub logo: &'static str,
    pub download_image_headers: HeaderMap,
    pub sample: HashMap<&'static str, &'static str>,
    pub is_searchable: bool,
    pub is_coded: bool,
}

impl Default for BaseModule {
    fn default() -> Self {
        Self {
            type_: "",
            domain: "",
            logo: "",
            download_image_headers: HeaderMap::new(),
            sample: HashMap::new(),
            is_searchable: false,
            is_coded: false,
        }
    }
}

#[async_trait]
pub trait Module: Send + Sync {
    fn base(&self) -> &BaseModule;
    fn get_module_sample(&self) -> HashMap<String, String> {
        self.base()
            .sample
            .to_owned()
            .into_iter()
            .map(|(k, v)| (k.to_owned(), v.to_owned()))
            .collect()
    }
    fn get_module_info(&self) -> Result<HashMap<String, Value>, AppError> {
        let base: &BaseModule = self.base();
        Ok(HashMap::from([
            ("type".to_owned(), Value::from(base.type_)),
            ("domain".to_owned(), Value::from(base.domain)),
            ("logo".to_owned(), Value::from(base.logo)),
            ("is_searchable".to_owned(), Value::Bool(base.is_searchable)),
            ("is_coded".to_owned(), Value::Bool(base.is_coded)),
        ]))
    }
    async fn download_image(
        &self,
        url: String,
        image_name: String,
    ) -> Result<Option<String>, AppError> {
        let (response, _) = self
            .send_request(
                &url,
                Method::GET,
                self.base().download_image_headers.to_owned(),
                None,
                None,
                None,
                None,
                None,
            )
            .await?;
        let stream = response
            .bytes_stream()
            .map_err(|err: ReqwestError| IoError::new(IoErrorKind::Other, err.to_string()));
        let mut reader = StreamReader::new(stream);
        let mut file: File = File::create(&image_name)
            .await
            .map_err(|err: IoError| AppError::file("create", &image_name, err))?;
        copy(&mut reader, &mut file)
            .await
            .map_err(|err: IoError| AppError::file("copy", &image_name, err))?;
        file.flush()
            .await
            .map_err(|err: IoError| AppError::file("flush", &image_name, err))?;
        Ok(Some(image_name))
    }
    async fn retrieve_image(&self, url: String) -> Result<String, AppError> {
        let (response, _) = self
            .send_request(
                &url,
                Method::GET,
                self.base().download_image_headers.to_owned(),
                None,
                None,
                None,
                None,
                None,
            )
            .await?;
        let image: Bytes = response.bytes().await?;
        let encoded_image: String = general_purpose::STANDARD.encode(image);
        Ok(format!("data:image/png;base64, {encoded_image}"))
    }
    async fn get_images(
        &self,
        _manga: String,
        _chapter: String,
    ) -> Result<(Vec<String>, Value), AppError> {
        Ok(Default::default())
    }
    async fn get_info(&self, _manga: String) -> Result<HashMap<String, Value>, AppError> {
        Ok(Default::default())
    }
    async fn get_chapters(&self, _manga: String) -> Result<Vec<HashMap<String, String>>, AppError> {
        Ok(Default::default())
    }
    async fn search_by_keyword(
        &self,
        _keyword: String,
        _absolute: bool,
        _sleep_time: f64,
        _page_limit: u32,
    ) -> Result<Vec<HashMap<String, String>>, AppError> {
        Ok(Default::default())
    }
    fn rename_chapter(&self, chapter: String) -> String {
        let mut new_name: String = String::new();
        let mut reached_number: bool = false;
        for ch in chapter.chars() {
            if ch.is_digit(10) {
                new_name.push(ch);
                reached_number = true;
            } else if (ch == '-' || ch == '.')
                && reached_number
                && new_name.chars().last().unwrap_or(' ') != '.'
            {
                new_name.push('.');
            }
        }
        if !reached_number {
            return chapter;
        }
        new_name = new_name.trim_end_matches('.').to_owned();
        match new_name.parse::<i32>() {
            Ok(num) => format!("Chapter {:03}", num),
            Err(_) => {
                let parts: Vec<&str> = new_name.split('.').collect();
                match parts[0].parse::<i32>() {
                    Ok(num) => format!("Chapter {:03}.{}", num, parts[1]),
                    Err(_) => chapter,
                }
            }
        }
    }
    async fn send_request(
        &self,
        url: &str,
        method: Method,
        headers: HeaderMap,
        verify: Option<bool>,
        data: Option<Value>,
        json: Option<Value>,
        params: Option<Value>,
        client: Option<Client>,
    ) -> Result<(Response, Client), AppError> {
        let client: Client = match client {
            Some(c) => c,
            None => Client::builder()
                .danger_accept_invalid_certs(verify.unwrap_or(true))
                .build()?,
        };
        let mut request: RequestBuilder = client.request(method, url).headers(headers);
        if let Some(p) = params {
            request = request.query(&p);
        }
        if let Some(d) = data {
            request = request.form(&d);
        }
        if let Some(j) = json {
            request = request.json(&j);
        }
        let response: Response = request.send().await?;
        if !response.status().is_success() {
            return Err(AppError::ReqwestError(format!(
                "Received non-200 status code for {url}: {}",
                response.status()
            )));
        }
        Ok((response, client))
    }
    async fn send_simple_request(
        &self,
        url: &str,
        client: Option<Client>,
    ) -> Result<(Response, Client), AppError> {
        self.send_request(
            url,
            Method::GET,
            HeaderMap::new(),
            None,
            None,
            None,
            None,
            client,
        )
        .await
    }
    fn sleep(&self, sleep_time: f64) {
        thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
    }
}
