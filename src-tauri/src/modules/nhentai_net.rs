use async_trait::async_trait;
use reqwest::Response;
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error};

use crate::models::{BaseModule, Module};

pub struct Nhentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Nhentai {
    fn base(&self) -> &BaseModule {
        &self.base
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
}

impl Nhentai {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Doujin",
                logo: "nhentai.net",
                domain: "https://static.nhentai.net/img/logo.090da3be7b51.svg",
                sample: HashMap::from([("code", "2")]),
                searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
