use async_trait::async_trait;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error, thread, time::Duration};

use crate::models::{BaseModule, Module};

pub struct Simplyhentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Simplyhentai {
    fn base(&self) -> &BaseModule {
        &self.base
    }

    async fn get_info(&self, code: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://simplyhentai.org/g/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        if let Some(cover_element) = document.find(Attr("id", "cover")).next() {
            if let Some(img) = cover_element.find(Name("img")).next() {
                info.insert(
                    "Cover".to_string(),
                    to_value(img.attr("src").unwrap_or_default()).unwrap_or_default(),
                );
            }
        }
        if let Some(info_box) = document.find(Attr("id", "info")).next() {
            if let Some(title_element) = info_box.find(Name("h1")).next() {
                info.insert(
                    "Title".to_string(),
                    to_value(title_element.text().trim()).unwrap_or_default(),
                );
            }
            if let Some(alternative_element) = info_box.find(Name("h2")).next() {
                info.insert(
                    "Alternative".to_string(),
                    to_value(alternative_element.text().trim()).unwrap_or_default(),
                );
            }
        }
        if let Some(uploaded_element) = document.find(Name("time")).next() {
            info.insert(
                "Uploaded".to_string(),
                to_value(uploaded_element.attr("datetime").unwrap_or_default()).unwrap_or_default(),
            );
        }
        if let Some(tags_section) = document
            .find(Name("section").and(Attr("id", "tags")))
            .next()
        {
            if let Some(pages_element) = tags_section
                .find(|tag: &Node| tag.text().contains("Pages:"))
                .next()
            {
                info.insert(
                    "Pages".to_string(),
                    to_value(pages_element.text().replace("Pages:", "").trim()).unwrap_or_default(),
                );
            }
        }
        for tag_box in document
            .find(Name("section").and(Attr("id", "tags")))
            .next()
            .unwrap()
            .find(Class("tag-container").and(Class("field-name")))
        {
            if tag_box.text().contains("Pages:") || tag_box.text().contains("Uploaded:") {
                continue;
            }
            let key: String = tag_box.first_child().unwrap().text().trim().to_string();
            let values: Vec<String> = tag_box
                .find(Name("a"))
                .map(|link: Node| {
                    link.find(Name("span").and(Class("name")))
                        .next()
                        .unwrap()
                        .text()
                })
                .collect();
            extras.insert(key, to_value(values).unwrap_or_default());
        }
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(
        &self,
        code: String,
        _: String,
    ) -> Result<(Vec<String>, Value), Box<dyn Error>> {
        let url: String = format!("https://simplyhentai.org/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Class("gallerythumb").and(Name("a")).descendant(Name("img")))
            .filter_map(|node: Node| node.attr("src"))
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
                    &format!("https://simplyhentai.org/search?q={keyword}&page={page}"),
                    client,
                )
                .await?;
            client = Some(new_client);
            let document: Document = Document::from(response.text().await?.as_str());
            let doujins: Vec<Node> = document
                .find(Name("div").and(Attr("class", "gallery")))
                .collect();
            if doujins.is_empty() {
                break;
            }
            for doujin in doujins {
                if absolute && !doujin.text().contains(&keyword) {
                    continue;
                }
                let code: String = doujin
                    .find(Name("a"))
                    .next()
                    .unwrap()
                    .attr("href")
                    .unwrap()
                    .to_string()
                    .replace("/g/", "")
                    .replace("/", "");
                let title: String = doujin
                    .find(Name("div").and(Attr("class", "caption")))
                    .next()
                    .unwrap()
                    .text();
                let thumbnail: &str = doujin
                    .find(Name("img"))
                    .next()
                    .unwrap()
                    .attr("src")
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

impl Simplyhentai {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Doujin",
                domain: "simplyhentai.org",
                logo: "https://simplyhentai.org/img/logo.svg",
                sample: HashMap::from([("code", "1")]),
                searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
