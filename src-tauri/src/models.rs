use async_trait::async_trait;
use futures::TryStreamExt;
use reqwest::{
    header::HeaderMap,
    Client, Method, RequestBuilder, Response,
};
use serde_json::Value;
use std::{
    collections::HashMap,
    error::Error,
    io::{Error as IoError, ErrorKind::Other},
};
use tokio::{
    fs::File,
    io::{self, AsyncWriteExt},
};
use tokio_util::io::StreamReader;

pub struct BaseModule {
    pub(crate) type_: &'static str,
    pub(crate) domain: &'static str,
    pub(crate) logo: &'static str,
    pub(crate) download_image_headers: HeaderMap,
    pub(crate) sample: HashMap<&'static str, &'static str>,
    pub(crate) searchable: bool,
    pub(crate) is_coded: bool,
}

impl Default for BaseModule {
    fn default() -> Self {
        Self {
            type_: "",
            domain: "",
            logo: "",
            download_image_headers: HeaderMap::default(),
            sample: HashMap::new(),
            searchable: false,
            is_coded: false,
        }
    }
}

#[async_trait]
pub trait Module: Send + Sync {
    fn base(&self) -> &BaseModule;
    fn get_type(&self) -> String {
        self.base().type_.to_string()
    }
    fn get_domain(&self) -> String {
        self.base().domain.to_string()
    }
    fn get_logo(&self) -> String {
        self.base().logo.to_string()
    }
    fn get_download_image_headers(&self) -> HeaderMap {
        self.base().download_image_headers.clone()
    }
    fn get_module_sample(&self) -> HashMap<&'static str, &'static str> {
        self.base().sample.clone()
    }
    fn is_searchable(&self) -> bool {
        self.base().searchable
    }
    fn is_coded(&self) -> bool {
        self.base().is_coded
    }
    async fn download_image(
        &self,
        url: String,
        image_name: String,
    ) -> Result<Option<String>, Box<dyn Error>> {
        let response: Response = self
            .send_request(
                &url,
                Method::GET,
                self.get_download_image_headers(),
                Some(true),
            )
            .await?;
        let stream = response
            .bytes_stream()
            .map_err(|e| IoError::new(Other, e.to_string()));
        let mut reader = StreamReader::new(stream);
        let mut file: File = File::create(&image_name).await?;
        io::copy(&mut reader, &mut file).await?;
        file.flush().await?;
        Ok(Some(image_name.to_string()))
    }
    async fn retrieve_image(&self, url: String) -> Result<Response, Box<dyn Error>> {
        Ok(self
            .send_request(
                &url,
                Method::GET,
                self.get_download_image_headers(),
                Some(true),
            )
            .await?)
    }
    async fn get_images(
        &self,
        _manga: String,
        _chapter: String,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        Ok(Default::default())
    }
    async fn get_info(&self, _manga: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        Ok(Default::default())
    }
    async fn get_chapters(
        &self,
        _manga: String,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        Ok(Default::default())
    }
    async fn search_by_keyword(
        &self,
        _keyword: String,
        _absolute: bool,
        _sleep_time: f64,
        _page_limit: u32,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        Ok(Vec::<HashMap<String, String>>::new())
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
            return chapter.to_string();
        }
        new_name = new_name.trim_end_matches('.').to_string();
        match new_name.parse::<i32>() {
            Ok(num) => format!("Chapter {:03}", num),
            Err(_) => {
                let parts: Vec<&str> = new_name.split('.').collect();
                format!(
                    "Chapter {:03}.{}",
                    parts[0].parse::<i32>().unwrap(),
                    parts[1]
                )
            }
        }
    }
    async fn send_request(
        &self,
        url: &str,
        method: Method,
        headers: HeaderMap,
        verify: Option<bool>,
    ) -> Result<Response, Box<dyn Error>> {
        let client: Client = Client::builder()
            .danger_accept_invalid_certs(verify.unwrap_or(true))
            .build()?;
        let request: RequestBuilder = client.request(method, url).headers(headers);
        let response: Response = request.send().await?;
        if !response.status().is_success() {
            return Err(Box::new(IoError::new(
                Other,
                format!("Received non-200 status code: {}", response.status()),
            )));
        }
        Ok(response)
    }
    async fn send_simple_request(&self, url: &str) -> Result<Response, Box<dyn Error>> {
        self.send_request(url, Method::GET, HeaderMap::new(), Some(true)).await
    }
}

pub struct DefaultModule {
    base: BaseModule,
}

#[async_trait]
impl Module for DefaultModule {
    fn base(&self) -> &BaseModule {
        &self.base
    }
}

impl DefaultModule {
    pub fn new() -> Self {
        Self {
            base: BaseModule::default(),
        }
    }
}
