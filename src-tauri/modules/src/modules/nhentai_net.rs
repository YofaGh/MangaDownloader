use async_trait::async_trait;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
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
        let url: String = format!("https://nhentai.net/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        document
            .find(Attr("id", "cover"))
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
            .find(Attr("id", "info"))
            .next()
            .and_then(|info_box: Node<'_>| {
                info_box
                    .find(Name("h1"))
                    .next()
                    .and_then(|title_element: Node<'_>| {
                        info.insert(
                            "Title".to_string(),
                            to_value(title_element.text().trim()).unwrap_or_default(),
                        )
                    });
                info_box
                    .find(Name("h2"))
                    .next()
                    .and_then(|alternative_element: Node<'_>| {
                        info.insert(
                            "Alternative".to_string(),
                            to_value(alternative_element.text().trim()).unwrap_or_default(),
                        )
                    })
            });
        document
            .find(Name("time"))
            .next()
            .and_then(|uploaded_element: Node<'_>| {
                uploaded_element
                    .attr("datetime")
                    .and_then(|datetime: &str| {
                        info.insert(
                            "Uploaded".to_string(),
                            to_value(datetime).unwrap_or_default(),
                        )
                    })
            });
        document
            .find(Name("section").and(Attr("id", "tags")))
            .next()
            .and_then(|tags_section: Node<'_>| {
                tags_section
                    .find(|tag: &Node| tag.text().contains("Pages:"))
                    .next()
                    .and_then(|pages_element: Node<'_>| {
                        info.insert(
                            "Pages".to_string(),
                            to_value(pages_element.text().replace("Pages:", "").trim())
                                .unwrap_or_default(),
                        )
                    })
            });
        document
            .find(Name("section").and(Attr("id", "tags")))
            .next()
            .and_then(|box_: Node<'_>| {
                box_.find(Class("tag-container").and(Class("field-name")))
                    .into_iter()
                    .for_each(|tag: Node<'_>| {
                        if tag.text().contains("Pages:") || tag.text().contains("Uploaded:") {
                            return;
                        }
                        tag.first_child().and_then(|first: Node<'_>| {
                            let values: Vec<String> = tag
                                .find(Name("a"))
                                .filter_map(|link: Node| {
                                    link.find(Name("span").and(Class("name")))
                                        .next()
                                        .and_then(|span: Node<'_>| Some(span.text()))
                                })
                                .collect();
                            extras.insert(
                                first.text().trim().to_string(),
                                to_value(values).unwrap_or_default(),
                            )
                        });
                    });
                Some(())
            });
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(&self, code: String, _: String) -> Result<(Vec<String>, Value), AppError> {
        let url: String = format!("https://nhentai.net/g/{code}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Class("gallerythumb").and(Name("a")).descendant(Name("img")))
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
                    &format!("https://nhentai.net/search?q={keyword}&page={page}"),
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
                let Some(title) = doujin
                    .find(Name("div").and(Attr("class", "caption")))
                    .next()
                else {
                    continue;
                };
                let Some(code) = doujin
                    .find(Name("a"))
                    .next()
                    .and_then(|a: Node<'_>| a.attr("href"))
                else {
                    continue;
                };
                let code: String = code.to_string().replace("/g/", "").replace("/", "");
                let mut result: HashMap<String, String> = HashMap::from([
                    ("name".to_string(), title.text()),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("code".to_string(), code),
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
                domain: "nhentai.net",
                logo: "https://static.nhentai.net/img/logo.090da3be7b51.svg",
                sample: HashMap::from([("code", "1")]),
                searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
