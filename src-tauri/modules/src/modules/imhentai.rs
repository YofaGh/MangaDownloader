use async_trait::async_trait;
use indexmap::IndexMap;
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

pub struct Imhentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Imhentai {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, code: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://imhentai.xxx/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        document
            .find(Name("div").and(Attr("class", "col-md-4 col left_cover")))
            .next()
            .and_then(|cover_e: Node<'_>| {
                cover_e.find(Name("img")).next().and_then(|img: Node<'_>| {
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
            .find(Name("p").and(Class("subtitle")))
            .next()
            .and_then(|alt_element: Node<'_>| {
                info.insert(
                    "Alternative".to_string(),
                    to_value(alt_element.text().trim()).unwrap_or_default(),
                )
            });
        document
            .find(|n: &Node| n.name() == Some("li") && n.text().contains("Pages"))
            .next()
            .and_then(|pages_element: Node<'_>| {
                info.insert(
                    "Pages".to_string(),
                    to_value(pages_element.text().replace("Pages: ", "")).unwrap_or_default(),
                )
            });
        document
            .find(|n: &Node| n.name() == Some("li") && n.text().contains("Posted"))
            .next()
            .and_then(|posted_element: Node<'_>| {
                extras.insert(
                    "Posted".to_string(),
                    to_value(posted_element.text().replace("Posted: ", "")).unwrap_or_default(),
                )
            });
        let mut boxes: Vec<Node<'_>> = Vec::new();
        if let Some(tag_box) = document
            .find(Name("ul").and(Class("galleries_info")))
            .next()
        {
            boxes = tag_box.find(Name("li")).collect();
        }
        for box_item in boxes {
            if box_item.text().contains("Pages") || box_item.text().contains("Posted") {
                continue;
            }
            let Some(key) = box_item.find(Name("span")).next() else {
                continue;
            };
            let values: Vec<String> = box_item
                .find(Name("a"))
                .filter_map(|a: Node| {
                    a.first_child()
                        .and_then(|element: Node<'_>| Some(element.text().trim().to_string()))
                })
                .collect();
            extras.insert(
                key.text().trim_end_matches(':').to_string(),
                to_value(values).unwrap_or_default(),
            );
        }
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(&self, code: String, _: String) -> Result<(Vec<String>, Value), AppError> {
        const IMAGE_FORMATS: &'static [(&'static str, &'static str)] =
            &[("j", "jpg"), ("p", "png"), ("b", "bmp"), ("g", "gif")];
        let url: String = format!("https://imhentai.xxx/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let path: &str = document
            .find(Name("div").and(Attr("id", "append_thumbs")))
            .next()
            .ok_or_else(|| AppError::parser(&code, "div id append_thumbs"))?
            .find(Name("img"))
            .next()
            .ok_or_else(|| AppError::parser(&code, "img"))?
            .attr("data-src")
            .ok_or_else(|| AppError::parser(&code, "img data-src"))?
            .rsplit_once("/")
            .ok_or_else(|| AppError::parser(&code, "rsplit once /"))?
            .0;
        let script: String = document
            .find(|n: &Node| n.name() == Some("script") && n.text().contains("var g_th"))
            .next()
            .ok_or_else(|| AppError::parser(&code, "script var g_th"))?
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
                    .into_iter()
                    .find_map(|&(k, v)| (k == value.split(",").next().unwrap_or("")).then_some(v))
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
    ) -> Result<Vec<HashMap<String, String>>, AppError> {
        let mut results: Vec<HashMap<String, String>> = Vec::new();
        let mut page: u32 = 1;
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let (response, new_client) = self
                .send_simple_request(
                    &format!("https://imhentai.xxx/search/?key={keyword}&page={page}"),
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
                let Some(caption) = doujin
                    .find(Name("div").and(Class("caption")))
                    .next()
                    .and_then(|c: Node| c.find(Name("a")).next())
                else {
                    continue;
                };
                let title: String = caption.text();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(code) = caption.attr("href") else {
                    continue;
                };
                let code: Vec<&str> = code.rsplit("/").collect();
                if code.len() < 2 {
                    continue;
                }
                let code: String = code[1].to_string();
                let mut result: HashMap<String, String> = HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("code".to_string(), code),
                    ("page".to_string(), page.to_string()),
                ]);
                doujin
                    .find(Name("div").and(Class("inner_thumb")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element
                            .find(Name("img"))
                            .next()
                            .and_then(|element: Node<'_>| {
                                element.attr("data-src").and_then(|img: &str| {
                                    result.insert("thumbnail".to_string(), img.to_string())
                                })
                            })
                    });
                doujin
                    .find(Name("a").and(Class("thumb_cat")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        result.insert("category".to_string(), element.text())
                    });
                results.push(result);
            }
            page += 1;
            self.sleep(sleep_time);
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
