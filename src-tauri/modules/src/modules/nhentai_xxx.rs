use async_trait::async_trait;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Class, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error, thread, time::Duration};

use crate::models::{BaseModule, Module};

pub struct Nhentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Nhentai {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, code: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://nhentai.xxx/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        if let Some(cover_element) = document.find(Class("cover")).next() {
            if let Some(img) = cover_element.find(Name("img")).next() {
                info.insert(
                    "Cover".to_string(),
                    to_value(img.attr("data-src").unwrap_or_default()).unwrap_or_default(),
                );
            }
        }
        if let Some(title_element) = document.find(Name("h1")).next() {
            info.insert(
                "Title".to_string(),
                to_value(title_element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(alternative_element) = document.find(Name("h2")).next() {
            info.insert(
                "Alternative".to_string(),
                to_value(alternative_element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .find(Name("li"))
            .filter(|n: &Node| n.text().contains("Pages:"))
            .next()
        {
            info.insert(
                "Pages".to_string(),
                to_value(element.text().replace("Pages:", "").trim()).unwrap_or_default(),
            );
        }
        if let Some(element) = document
            .find(Name("li"))
            .filter(|n: &Node| n.text().contains("Uploaded:"))
            .next()
        {
            info.insert(
                "Uploaded".to_string(),
                to_value(element.text().replace("Uploaded:", "").trim()).unwrap_or_default(),
            );
        }
        for tag_box in document.find(Name("li").and(Class("tags"))) {
            let key: String = tag_box.first_child().unwrap().text().trim().to_string();
            let values: Vec<String> = tag_box
                .find(Name("span").and(Class("tag_name")))
                .map(|link: Node| link.text())
                .collect();
            extras.insert(key.replace(":", ""), to_value(values).unwrap_or_default());
        }
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(
        &self,
        code: String,
        _: String,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url: String = format!("https://nhentai.xxx/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(
                Class("gallery_thumbs")
                    .and(Name("div"))
                    .descendant(Name("img")),
            )
            .filter_map(|node: Node| node.attr("data-src"))
            .map(|image: &str| {
                format!(
                    "{}/{}",
                    image.replace("//t", "//i").rsplit_once("/").unwrap().0,
                    image.rsplit('/').next().unwrap().replace("t.", ".")
                )
            })
            .collect();
        Ok((images, Value::Bool(false)))
    }

    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
        let mut results: Vec<HashMap<String, String>> = Vec::new();
        let mut page: u32 = 1;
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let (response, new_client) = self
                .send_simple_request(
                    &format!("https://nhentai.xxx/search?q={keyword}&page={page}"),
                    client,
                )
                .await?;
            if !response.status().is_success() {
                break;
            }
            client = Some(new_client);
            let document: Document = Document::from(response.text().await?.as_str());
            let doujins: Vec<Node> = document
                .find(Name("div").and(Class("gallery_item")))
                .collect();
            if doujins.is_empty() {
                break;
            }
            for doujin in doujins {
                let title: String = doujin
                    .find(Name("a"))
                    .next()
                    .unwrap()
                    .attr("title")
                    .unwrap()
                    .to_string();
                if absolute && !title.contains(&keyword) {
                    continue;
                }
                let code: String = doujin
                    .find(Name("a"))
                    .next()
                    .unwrap()
                    .attr("href")
                    .unwrap()
                    .rsplit("/")
                    .nth(1)
                    .unwrap()
                    .to_string();
                let thumbnail: &str = doujin
                    .find(Name("img"))
                    .next()
                    .unwrap()
                    .attr("data-src")
                    .unwrap();
                results.push(HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("code".to_string(), code),
                    ("thumbnail".to_string(), thumbnail.to_string()),
                    ("page".to_string(), page.to_string()),
                ]));
            }
            page += 1;
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
        }
        Ok(results)
    }
}

impl Nhentai {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Doujin",
                domain: "nhentai.xxx",
                logo: "https://nhentai.xxx/front/logo.svg",
                sample: HashMap::from([("code", "1")]),
                searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
