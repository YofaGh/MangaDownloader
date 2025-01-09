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
    insert,
    models::{BaseModule, Module},
    search_map,
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
            .find(Class("cover").descendant(Name("img")))
            .next()
            .and_then(|img: Node| {
                img.attr("data-src")
                    .and_then(|src: &str| insert!(info, "Cover", src))
            });
        document
            .find(Name("h1"))
            .next()
            .and_then(|title_element: Node| insert!(info, "Title", title_element.text().trim()));
        document
            .find(Name("h2"))
            .next()
            .and_then(|alternative_element: Node| {
                insert!(info, "Alternative", alternative_element.text().trim())
            });
        document
            .find(Name("li"))
            .filter(|n: &Node| n.text().contains("Pages:"))
            .next()
            .and_then(|pages_element: Node| {
                insert!(
                    info,
                    "Pages",
                    pages_element.text().replace("Pages:", "").trim()
                )
            });
        document
            .find(Name("li"))
            .filter(|n: &Node| n.text().contains("Uploaded:"))
            .next()
            .and_then(|uploaded_element: Node| {
                insert!(
                    extras,
                    "Uploaded",
                    uploaded_element.text().replace("Uploaded:", "").trim()
                )
            });
        document
            .find(Name("li").and(Class("tags")))
            .into_iter()
            .for_each(|tag_box: Node| {
                tag_box.first_child().and_then(|key: Node| {
                    let values: Vec<String> = tag_box
                        .find(Name("span").and(Class("tag_name")))
                        .map(|link: Node| link.text())
                        .collect();
                    insert!(extras, key.text().trim().replace(":", ""), values)
                });
            });
        insert!(info, "Extras", extras);
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
            .map(|node: Node| {
                let image: &str = node
                    .attr("data-src")
                    .ok_or_else(|| AppError::parser(&url, "Invalid image attr"))?;
                let imagen: String = image.replace("//t", "//i");
                let name: &str = imagen
                    .rsplit_once("/")
                    .ok_or_else(|| AppError::parser(&url, "Invalid image filename format"))?
                    .0;
                let ext: String = image
                    .rsplit('/')
                    .next()
                    .ok_or_else(|| AppError::parser(&url, "Invalid image filename extension"))?
                    .replace("t.", ".");
                Ok(format!("{name}/{ext}"))
            })
            .collect::<Result<Vec<String>, AppError>>()?;
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
                    .and_then(|a: Node| a.attr("title"))
                else {
                    continue;
                };
                if absolute && !title.contains(&keyword) {
                    continue;
                }
                let Some(code) = doujin.find(Name("a")).next().and_then(|a: Node| {
                    a.attr("href")
                        .and_then(|href: &str| href.rsplit("/").nth(1))
                }) else {
                    continue;
                };
                let mut result: HashMap<String, String> =
                    search_map!(title, self.base.domain, "code", code, page);
                doujin.find(Name("img")).next().and_then(|img: Node| {
                    img.attr("data-src")
                        .and_then(|src: &str| result.insert("thumbnail".to_owned(), src.to_owned()))
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
                logo: "https://nhentai.xxx/images/logo.svg",
                sample: HashMap::from([("code", "1")]),
                is_searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
