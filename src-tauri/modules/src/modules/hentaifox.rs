use async_trait::async_trait;
use indexmap::IndexMap;
use reqwest::Client;
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Not, Predicate},
};
use serde_json::{to_value, Value};
use std::collections::HashMap;

use crate::{
    errors::AppError,
    insert,
    models::{BaseModule, Module},
    search_map,
};

pub struct Hentaifox {
    base: BaseModule,
}

#[async_trait]
impl Module for Hentaifox {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, code: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://hentaifox.com/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        document
            .find(Name("div").and(Class("cover")).descendant(Name("img")))
            .next()
            .and_then(|img: Node<'_>| {
                img.attr("data-cfsrc")
                    .and_then(|src: &str| insert!(info, "Cover", src))
            });
        let info_box: Node<'_> = document
            .find(Name("div").and(Class("info")))
            .next()
            .ok_or_else(|| AppError::parser(&url, "info_box"))?;
        info_box
            .find(Name("h1"))
            .next()
            .and_then(|title_element: Node<'_>| {
                insert!(info, "Title", title_element.text().trim())
            });
        info_box
            .find(|n: &Node| n.text().contains("Pages"))
            .next()
            .and_then(|pages_element: Node<'_>| {
                insert!(info, "Pages", pages_element.text().replace("Pages: ", ""))
            });
        info_box
            .find(|n: &Node| n.text().contains("Posted"))
            .next()
            .and_then(|posted_element: Node<'_>| {
                insert!(
                    info,
                    "Posted",
                    posted_element.text().replace("Posted: ", "")
                )
            });
        for box_item in info_box.find(Name("ul").and(Not(Class("g_buttons")))) {
            let Some(key) = box_item.find(Name("span")).next() else {
                continue;
            };
            let values: Vec<String> = box_item
                .find(Name("a"))
                .filter_map(|a: Node| a.first_child())
                .map(|a: Node<'_>| a.text().trim().to_owned())
                .collect();
            insert!(extras, key.text().trim_end_matches(':'), values);
        }
        insert!(info, "Extras", extras);
        Ok(info)
    }

    async fn get_images(&self, code: String, _: String) -> Result<(Vec<String>, Value), AppError> {
        let image_formats: HashMap<&str, &str> = HashMap::from([
            ("j", "jpg"),
            ("p", "png"),
            ("b", "bmp"),
            ("g", "gif"),
            ("w", "webp"),
        ]);
        let url: String = format!("https://hentaifox.com/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let path: &str = (|| {
            let img: Node<'_> = document
                .find(
                    Name("div")
                        .and(Class("gallery_thumb"))
                        .descendant(Name("img")),
                )
                .next()?;
            let src: &str = img.attr("data-src")?;
            let (path, _) = src.rsplit_once("/")?;
            Some(path)
        })()
        .ok_or_else(|| AppError::parser(&url, "failed to get path"))?;
        let script: String = document
            .find(|n: &Node| n.name() == Some("script") && n.text().contains("var g_th"))
            .next()
            .ok_or_else(|| AppError::parser(&url, "script var g_th"))?
            .text();
        let json_str: String = script
            .replace("var g_th = $.parseJSON('", "")
            .replace("');", "");
        let images: IndexMap<String, String> = serde_json::from_str(&json_str)?;
        let image_urls: Vec<String> = images
            .into_iter()
            .map(|(key, value)| {
                (|| {
                    let format_key: &str = value.split(",").next()?;
                    let extension: &&str = image_formats.get(format_key)?;
                    Some(format!("{path}/{key}.{extension}"))
                })()
                .ok_or_else(|| AppError::parser(&url, "Invalid image filename format"))
            })
            .collect::<Result<Vec<String>, AppError>>()?;
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
                let Some(caption) = doujin
                    .find(
                        Name("div")
                            .and(Attr("class", "caption"))
                            .descendant(Name("a")),
                    )
                    .next()
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
                let mut result: HashMap<String, String> =
                    search_map!(title, self.base.domain, "code", code[1], page);
                doujin
                    .find(Name("img"))
                    .next()
                    .and_then(|element: Node<'_>| {
                        element.attr("data-cfsrc").and_then(|img: &str| {
                            result.insert("thumbnail".to_owned(), img.to_owned())
                        })
                    });
                doujin
                    .find(Name("a").and(Attr("class", "t_cat")))
                    .next()
                    .and_then(|element: Node<'_>| {
                        result.insert("category".to_owned(), element.text())
                    });
                results.push(result);
            }
            page += 1;
            self.sleep(sleep_time);
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
                is_searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
