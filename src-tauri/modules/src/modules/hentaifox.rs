use crate::models::{BaseModule, Module};
use async_trait::async_trait;
use indexmap::IndexMap;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Not, Predicate},
};
use serde_json::{to_value, Value};
use std::{collections::HashMap, error::Error, thread, time::Duration};

pub struct Hentaifox {
    base: BaseModule,
}

#[async_trait]
impl Module for Hentaifox {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, code: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
        let url: String = format!("https://hentaifox.com/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        if let Some(cover_e) = document.find(Name("div").and(Class("cover"))).next() {
            if let Some(img) = cover_e.find(Name("img")).next() {
                info.insert(
                    "Cover".to_string(),
                    to_value(img.attr("data-cfsrc").unwrap_or("")).unwrap_or_default(),
                );
            }
        }
        let info_box: Node<'_> = document
            .find(Name("div").and(Class("info")))
            .next()
            .unwrap();
        if let Some(title_element) = info_box.find(Name("h1")).next() {
            info.insert(
                "Title".to_string(),
                to_value(title_element.text().trim()).unwrap_or_default(),
            );
        }
        if let Some(pages_element) = info_box.find(|n: &Node| n.text().contains("Pages")).next() {
            info.insert(
                "Pages".to_string(),
                to_value(pages_element.text().replace("Pages: ", "")).unwrap_or_default(),
            );
        }
        let mut extras: HashMap<String, Value> = HashMap::new();
        if let Some(posted) = info_box.find(|n: &Node| n.text().contains("Posted")).next() {
            extras.insert(
                "Posted".to_string(),
                to_value(posted.text().replace("Posted: ", "")).unwrap_or_default(),
            );
        }
        let boxes: Vec<Node> = info_box
            .find(Name("ul").and(Not(Class("g_buttons"))))
            .collect();
        for box_item in boxes {
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
        let url: String = format!("https://hentaifox.com/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let path: &str = document
            .find(Name("div").and(Class("gallery_thumb")))
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
                format!("{path}/{key}.{format}")
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
                    &format!("https://hentaifox.com/search/?q={keyword}&page={page}"),
                    client,
                )
                .await?;
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let document: Document = Document::from(response.text().await?.as_str());
            let doujins: Vec<Node> = document
                .find(Name("div").and(Attr("class", "thumb")))
                .collect();
            if doujins.is_empty() {
                break;
            }
            for doujin in doujins {
                let caption: Node = doujin
                    .find(Name("div").and(Attr("class", "caption")))
                    .next()
                    .unwrap();
                let title: String = caption.find(Name("a")).next().unwrap().text();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                results.push(HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    (
                        "code".to_string(),
                        caption
                            .find(Name("a"))
                            .next()
                            .unwrap()
                            .attr("href")
                            .unwrap()
                            .rsplit("/")
                            .collect::<Vec<_>>()[1]
                            .to_string(),
                    ),
                    (
                        "thumbnail".to_string(),
                        doujin
                            .find(Name("img"))
                            .next()
                            .unwrap()
                            .attr("data-cfsrc")
                            .unwrap_or("")
                            .to_string(),
                    ),
                    (
                        "category".to_string(),
                        doujin
                            .find(Name("a").and(Attr("class", "t_cat")))
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

impl Hentaifox {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Doujin",
                domain: "hentaifox.com",
                logo: "https://hentaifox.com/images/logo.png",
                sample: HashMap::from([("code", "1")]),
                searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
