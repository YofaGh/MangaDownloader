extern crate reqwest;
extern crate select;
use futures::stream::TryStreamExt;
use reqwest::{
    header::{HeaderName, HeaderValue},
    Client, Error, Method, RequestBuilder, Response,
};
use serde_json::Value;
use std::{collections::HashMap, future::Future};
use tokio::fs::File;
use tokio::io::{self, AsyncWriteExt};
use tokio_util::io::StreamReader;

pub trait Module {
    fn send_request(
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

    fn send_request_n(
        &self,
        url: &str,
        method: &str,
        headers: Option<HashMap<&str, &str>>,
        verify: Option<bool>,
    ) -> Result<reqwest::blocking::Response, Error> {
        let client: reqwest::blocking::Client = reqwest::blocking::Client::builder()
            .danger_accept_invalid_certs(verify.unwrap_or(true))
            .build()?;
        let request: reqwest::blocking::RequestBuilder =
            client.request(Method::from_bytes(method.as_bytes()).unwrap(), url);
        let request: reqwest::blocking::RequestBuilder = match headers {
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

    async fn download_image(
        &self,
        url: &str,
        image_name: &str,
        headers: Option<HashMap<&str, &str>>,
        verify: Option<bool>,
    ) -> Option<String> {
        match Self::send_request(&self, url, "GET", headers, verify).await {
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
    async fn get_images(
        &self,
        manga: &str,
        chapter: &str,
    ) -> (Vec<String>, Value);
    fn get_info(&self, manga: &str) -> HashMap<&'static str, Value>;
}

pub trait Manga {
    fn rename_chapter(&self, chapter: &str) -> String {
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
    fn get_chapters(&self, manga: &str) -> Vec<HashMap<&'static str, String>>;
}

pub trait Doujin {
    async fn get_title(&self, code: &str) -> String;
}