use base64::{engine::general_purpose, Engine};
use reqwest::{header::HeaderMap, Method, RequestBuilder, Response};
use std::{
    fs::File,
    io::{copy, Error as IoError, Write},
    thread,
    time::Duration,
};
use tokio_util::bytes::Bytes;

use crate::prelude::*;

pub struct BaseModule {
    pub type_: &'static str,
    pub domain: &'static str,
    pub logo: &'static str,
    pub download_image_headers: HeaderMap,
    pub sample: HashMap<&'static str, &'static str>,
    pub is_searchable: bool,
    pub is_coded: bool,
}

#[derive(Default)]
pub struct RequestConfig {
    pub method: Method,
    pub headers: HeaderMap,
    pub verify: Option<bool>,
    pub data: Option<Value>,
    pub json: Option<Value>,
    pub params: Option<Value>,
    pub client: Option<Client>,
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
    fn get_module_sample(&self) -> BasicHashMap {
        self.base()
            .sample
            .iter()
            .map(|(&k, &v)| (k.to_owned(), v.to_owned()))
            .collect()
    }
    fn get_module_info(&self) -> Result<ValueHashMap> {
        let base: &BaseModule = self.base();
        Ok(HashMap::from([
            ("type".to_owned(), Value::from(base.type_)),
            ("domain".to_owned(), Value::from(base.domain)),
            ("logo".to_owned(), Value::from(base.logo)),
            ("is_searchable".to_owned(), Value::Bool(base.is_searchable)),
            ("is_coded".to_owned(), Value::Bool(base.is_coded)),
        ]))
    }
    async fn download_image(&self, url: String, image_name: String) -> Result<Option<String>> {
        let (response, _) = self
            .send_request(
                &url,
                RequestConfig {
                    method: Method::GET,
                    headers: self.base().download_image_headers.to_owned(),
                    ..Default::default()
                },
            )
            .await?;
        let mut file: File = File::create(&image_name)
            .map_err(|err: IoError| Error::file("create", &image_name, err))?;
        let bytes: Bytes = response.bytes().await?;
        copy(&mut bytes.as_ref(), &mut file)
            .map_err(|err: IoError| Error::file("copy", &image_name, err))?;
        file.flush()
            .map_err(|err: IoError| Error::file("flush", &image_name, err))?;
        Ok(Some(image_name))
    }
    async fn retrieve_image(&self, url: String) -> Result<String> {
        let (response, _) = self
            .send_request(
                &url,
                RequestConfig {
                    method: Method::GET,
                    headers: self.base().download_image_headers.to_owned(),
                    ..Default::default()
                },
            )
            .await?;
        let image: Bytes = response.bytes().await?;
        let encoded_image: String = general_purpose::STANDARD.encode(image);
        Ok(format!("data:image/png;base64, {encoded_image}"))
    }
    async fn get_webtoon_url(&self, _url: String) -> Result<String> {
        Ok(Default::default())
    }
    async fn get_chapter_url(&self, _url: String, _chapter: String) -> Result<String> {
        Ok(Default::default())
    }
    async fn get_images(&self, _manga: String, _chapter: String) -> Result<(Vec<String>, Value)> {
        Ok(Default::default())
    }
    async fn get_info(&self, _manga: String) -> Result<ValueHashMap> {
        Ok(Default::default())
    }
    async fn get_chapters(&self, _manga: String) -> Result<Vec<BasicHashMap>> {
        Ok(Default::default())
    }
    async fn search_by_keyword(
        &self,
        _keyword: String,
        _absolute: bool,
        _sleep_time: f64,
        _page_limit: u32,
    ) -> Result<Vec<BasicHashMap>> {
        Ok(Default::default())
    }
    fn rename_chapter(&self, chapter: String) -> String {
        let mut new_name: String = String::new();
        let mut reached_number: bool = false;
        for ch in chapter.chars() {
            if ch.is_ascii_digit() {
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
    async fn send_request(&self, url: &str, config: RequestConfig) -> Result<(Response, Client)> {
        let client: Client = match config.client {
            Some(c) => c,
            None => Client::builder()
                .danger_accept_invalid_certs(config.verify.unwrap_or(true))
                .build()?,
        };
        let mut request: RequestBuilder =
            client.request(config.method, url).headers(config.headers);
        if let Some(p) = config.params {
            request = request.query(&p);
        }
        if let Some(d) = config.data {
            request = request.form(&d);
        }
        if let Some(j) = config.json {
            request = request.json(&j);
        }
        let response: Response = request.send().await?;
        if !response.status().is_success() {
            return Err(Error::ReqwestErr(format!(
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
    ) -> Result<(Response, Client)> {
        self.send_request(
            url,
            RequestConfig {
                method: Method::GET,
                client,
                ..Default::default()
            },
        )
        .await
    }
    fn sleep(&self, sleep_time: f64) {
        thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
    }
}

impl<T: Module + 'static> From<T> for BoxModule {
    fn from(module: T) -> Self {
        Box::new(module)
    }
}
