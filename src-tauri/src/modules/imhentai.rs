use crate::models::{BaseModule, Module};
use async_trait::async_trait;
use indexmap::IndexMap;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error, thread, time::Duration};

pub struct Imhentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Imhentai {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, code: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://imhentai.xxx/gallery/{}", code);
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        if let Some(cover_e) = document
            .find(Name("div").and(Attr("class", "col-md-4 col left_cover")))
            .next()
        {
            if let Some(img) = cover_e.find(Name("img")).next() {
                info.insert(
                    "Cover".to_string(),
                    to_value(img.attr("data-src").unwrap_or("")).unwrap_or_default(),
                );
            }
        }
        if let Some(title_element) = document.find(Name("h1")).next() {
            info.insert(
                "Title".to_string(),
                to_value(title_element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(title_element) = document.find(Name("p").and(Class("subtitle"))).next() {
            info.insert(
                "Alternative".to_string(),
                to_value(title_element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(pages_element) = document
            .find(|n: &Node| n.name() == Some("li") && n.text().contains("Pages"))
            .next()
        {
            info.insert(
                "Pages".to_string(),
                to_value(pages_element.text().replace("Pages: ", "")).unwrap_or_default(),
            );
        }
        if let Some(pages_element) = document
            .find(|n: &Node| n.name() == Some("li") && n.text().contains("Posted"))
            .next()
        {
            extras.insert(
                "Posted".to_string(),
                to_value(pages_element.text().replace("Posted: ", "")).unwrap_or_default(),
            );
        }
        let tag_box: Vec<Node> = document
            .find(Name("ul").and(Class("galleries_info")))
            .next()
            .unwrap()
            .find(Name("li"))
            .collect();
        for box_item in tag_box {
            if box_item.text().contains("Pages") || box_item.text().contains("Posted") {
                continue;
            }
            let key: String = box_item
                .find(Name("span"))
                .next()
                .unwrap()
                .text()
                .trim_end_matches(':')
                .to_string();
            let values: Vec<String> = box_item
                .find(Name("a"))
                .map(|a: Node| a.first_child().unwrap().text().trim().to_string())
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
        const IMAGE_FORMATS: &'static [(&'static str, &'static str)] =
            &[("j", "jpg"), ("p", "png"), ("b", "bmp"), ("g", "gif")];
        let url: String = format!("https://imhentai.xxx/gallery/{}", code);
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let path: &str = document
            .find(Name("div").and(Attr("id", "append_thumbs")))
            .next()
            .unwrap()
            .find(Name("img"))
            .next()
            .unwrap()
            .attr("data-src")
            .unwrap()
            .rsplit_once("/")
            .unwrap()
            .0;
        let script: String = document
            .find(|n: &Node| n.name() == Some("script") && n.text().contains("var g_th"))
            .next()
            .unwrap()
            .text();
        let json_str: String = script
            .replace("var g_th = $.parseJSON('", "")
            .replace("');", "")
            .to_string();
        let images: IndexMap<String, String> = serde_json::from_str(&json_str)?;
        let image_urls: Vec<String> = images
            .into_iter()
            .map(|(key, value)| {
                let format: &str = IMAGE_FORMATS
                    .iter()
                    .find(|&&(k, _)| k == value.split(",").next().unwrap_or(""))
                    .map(|&(_, v)| v)
                    .unwrap_or("jpg");
                format!("{}/{}.{}", path, key, format)
            })
            .collect();
        Ok((image_urls, Value::Bool(false)))
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
                    &format!("https://imhentai.xxx/search/?key={}&page={}", keyword, page),
                    client,
                )
                .await?;
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let doujins: Vec<Node> = document.find(Name("div").and(Class("thumb"))).collect();
            if doujins.is_empty() {
                break;
            }
            for doujin in doujins {
                let caption: Node = doujin
                    .find(Name("div").and(Class("caption")))
                    .next()
                    .unwrap()
                    .find(Name("a"))
                    .next()
                    .unwrap();
                let title: String = caption.text();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                results.push(HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    (
                        "code".to_string(),
                        caption
                            .attr("href")
                            .unwrap()
                            .rsplit("/")
                            .collect::<Vec<_>>()[1]
                            .to_string(),
                    ),
                    (
                        "thumbnail".to_string(),
                        doujin
                            .find(Name("div").and(Class("inner_thumb")))
                            .next()
                            .unwrap()
                            .find(Name("img"))
                            .next()
                            .unwrap()
                            .attr("data-src")
                            .unwrap_or("")
                            .to_string(),
                    ),
                    (
                        "category".to_string(),
                        doujin
                            .find(Name("a").and(Class("thumb_cat")))
                            .next()
                            .unwrap()
                            .text(),
                    ),
                    ("page".to_string(), page.to_string()),
                ]));
            }
            page += 1;
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
        }
        Ok(results)
    }
}

impl Imhentai {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Doujin",
                domain: "imhentai.xxx",
                logo: "https://imhentai.xxx/images/logo.png",
                sample: HashMap::from([("code", "1")]),
                searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
