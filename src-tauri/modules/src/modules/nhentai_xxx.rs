use async_trait::async_trait;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Class, Name, Predicate},
};
use serde_json::{to_value, Value};
use std::collections::HashMap;

use crate::{
    errors::AppError,
    models::{BaseModule, Module},
};

pub struct Nhentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Nhentai {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, code: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://nhentai.xxx/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        document
            .find(Class("cover"))
            .next()
            .and_then(|cover_element: Node<'_>| {
                cover_element
                    .find(Name("img"))
                    .next()
                    .and_then(|img: Node<'_>| {
                        img.attr("data-src").and_then(|src: &str| {
                            info.insert("Cover".to_string(), to_value(src).unwrap_or_default())
                        })
                    })
            });
        document
            .find(Name("h1"))
            .next()
            .and_then(|title_element: Node<'_>| {
                info.insert(
                    "Title".to_string(),
                    to_value(title_element.text().trim()).unwrap_or_default(),
                )
            });
        document
            .find(Name("h2"))
            .next()
            .and_then(|alternative_element: Node<'_>| {
                info.insert(
                    "Alternative".to_string(),
                    to_value(alternative_element.text().trim()).unwrap_or_default(),
                )
            });
        document
            .find(Name("li"))
            .filter(|n: &Node| n.text().contains("Pages:"))
            .next()
            .and_then(|pages_element: Node<'_>| {
                info.insert(
                    "Pages".to_string(),
                    to_value(pages_element.text().replace("Pages:", "").trim()).unwrap_or_default(),
                )
            });
        document
            .find(Name("li"))
            .filter(|n: &Node| n.text().contains("Uploaded:"))
            .next()
            .and_then(|uploaded_element: Node<'_>| {
                info.insert(
                    "Uploaded".to_string(),
                    to_value(uploaded_element.text().replace("Uploaded:", "").trim())
                        .unwrap_or_default(),
                )
            });
        document
            .find(Name("li").and(Class("tags")))
            .into_iter()
            .for_each(|tag_box: Node<'_>| {
                tag_box.first_child().and_then(|key: Node<'_>| {
                    let values: Vec<String> = tag_box
                        .find(Name("span").and(Class("tag_name")))
                        .map(|link: Node| link.text())
                        .collect();
                    extras.insert(
                        key.text().trim().to_string().replace(":", ""),
                        to_value(values).unwrap_or_default(),
                    )
                });
            });
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(&self, code: String, _: String) -> Result<(Vec<String>, Value), AppError> {
        let url: String = format!("https://nhentai.xxx/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(
                Class("gallery_thumbs")
                    .and(Name("div"))
                    .descendant(Name("img")),
            )
            .filter_map(|node: Node| {
                node.attr("data-src").and_then(|image: &str| {
                    format!(
                        "{}/{}",
                        image.replace("//t", "//i").rsplit_once("/").unwrap().0,
                        image.rsplit('/').next().unwrap().replace("t.", ".")
                    )
                    .into()
                })
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
    ) -> Result<Vec<HashMap<String, String>>, AppError> {
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
                let Some(title) = doujin
                    .find(Name("a"))
                    .next()
                    .and_then(|a: Node<'_>| a.attr("title"))
                else {
                    continue;
                };
                if absolute && !title.contains(&keyword) {
                    continue;
                }
                let Some(code) = doujin.find(Name("a")).next().and_then(|a: Node<'_>| {
                    a.attr("href")
                        .and_then(|href: &str| href.rsplit("/").nth(1))
                }) else {
                    continue;
                };
                let mut result: HashMap<String, String> = HashMap::from([
                    ("name".to_string(), title.to_string()),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("code".to_string(), code.to_string()),
                    ("page".to_string(), page.to_string()),
                ]);
                doujin.find(Name("img")).next().and_then(|img: Node<'_>| {
                    img.attr("data-src").and_then(|src: &str| {
                        result.insert("thumbnail".to_string(), src.to_string())
                    })
                });
                results.push(result);
            }
            page += 1;
            self.sleep(sleep_time);
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
