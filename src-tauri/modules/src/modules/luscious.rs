use async_trait::async_trait;
use chrono::{NaiveDate, NaiveDateTime};
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

pub struct Luscious {
    base: BaseModule,
}

#[async_trait]
impl Module for Luscious {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_info(&self, manga: String) -> Result<HashMap<String, Value>, AppError> {
        let url: String = format!("https://www.luscious.net/albums/{manga}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: HashMap<String, Value> = HashMap::new();
        let mut extras: HashMap<String, Value> = HashMap::new();
        let mut dates: HashMap<String, Value> = HashMap::new();
        document
            .find(Name("div").and(Class("picture-card-outer")))
            .next()
            .and_then(|element: Node<'_>| {
                element
                    .find(Name("img"))
                    .next()
                    .and_then(|image: Node<'_>| {
                        image.attr("src").and_then(|src: &str| {
                            info.insert("Cover".to_string(), to_value(src).unwrap_or_default())
                        })
                    })
            });
        document
            .find(Name("h1").and(Attr("class", "o-h1 album-heading")))
            .next()
            .and_then(|element: Node<'_>| {
                info.insert(
                    "Title".to_string(),
                    to_value(element.text()).unwrap_or_default(),
                )
            });
        document
            .find(Name("div").and(Class("album-description")))
            .next()
            .and_then(|description: Node<'_>| {
                extras.insert(
                    "Album Description".to_string(),
                    to_value(description.text().trim().to_string()).unwrap_or_default(),
                )
            });
        document
            .find(Name("div").and(Class("album-info-item").or(Class("o-tag--category"))))
            .for_each(|box_element: Node<'_>| {
                box_element
                    .find(Name("strong"))
                    .next()
                    .and_then(|strong: Node<'_>| {
                        extras.insert(
                            strong.text().trim().trim_end_matches(':').to_string(),
                            to_value(
                                box_element
                                    .find(Name("a"))
                                    .map(|a: Node| a.text().trim().to_string())
                                    .collect::<Vec<String>>(),
                            )
                            .unwrap_or_default(),
                        )
                    });
            });
        document
            .find(Name("div").and(Class("o-tag--secondary")))
            .for_each(|box_element: Node<'_>| {
                box_element.first_child().and_then(|element: Node<'_>| {
                    extras.insert(
                        "Tags".to_string(),
                        to_value(element.text().trim().to_string()).unwrap_or_default(),
                    )
                });
            });
        let Some(info_box) = document
            .find(Name("div").and(Class("album-info-wrapper")))
            .next()
        else {
            info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
            return Ok(info);
        };
        info_box
            .find(Name("h2"))
            .next()
            .and_then(|alternative_element: Node<'_>| {
                info.insert(
                    "Alternative".to_string(),
                    to_value(alternative_element.text().trim().to_string()).unwrap_or_default(),
                )
            });
        info_box
            .find(Name("a").and(Class("language_flags-module__link--dp0Rr")))
            .next()
            .and_then(|language_element: Node<'_>| {
                extras.insert(
                    "Language".to_string(),
                    to_value(language_element.text().trim()).unwrap_or_default(),
                )
            });
        info_box
            .find(Name("span").and(Class("album-info-item")))
            .for_each(|box_element: Node<'_>| {
                let text: String = box_element.text().trim().to_string();
                if text.contains("pictures") {
                    info.insert(
                        "Pages".to_string(),
                        to_value(text.replace(" pictures", "")).unwrap_or_default(),
                    );
                } else {
                    if let (Some(strong), Some(date_str)) = (
                        box_element.find(Name("strong")).next(),
                        box_element.last_child(),
                    ) {
                        if let Ok(date) =
                            NaiveDate::parse_from_str(date_str.text().trim(), "%B %dth, %Y")
                        {
                            date.and_hms_opt(0, 0, 0).and_then(|datetime: NaiveDateTime| {
                                dates.insert(
                                    strong.text().trim_end_matches(':').to_string(),
                                    to_value(datetime.format("%Y-%m-%d %H:%M:%S").to_string()).unwrap_or_default(),
                                )
                            });
                        }
                    }
                }
            });
        info.insert("Extras".to_string(), to_value(extras).unwrap_or_default());
        info.insert("Dates".to_string(), to_value(dates).unwrap_or_default());
        Ok(info)
    }

    async fn get_images(&self, manga: String, _: String) -> Result<(Vec<String>, Value), AppError> {
        let data: &str = "https://apicdn.luscious.net/graphql/nobatch/?operationName=PictureListInsideAlbum&query=%2520query\
        %2520PictureListInsideAlbum%28%2524input%253A%2520PictureListInput%21%29%2520%257B%2520picture\
        %2520%257B%2520list%28input%253A%2520%2524input%29%2520%257B%2520info%2520%257B%2520...\
        FacetCollectionInfo%2520%257D%2520items%2520%257B%2520url_to_original%2520position%2520%257B%2520category\
        %2520text%2520url%2520%257D%2520thumbnails%2520%257B%2520width%2520height%2520size\
        %2520url%2520%257D%2520%257D%2520%257D%2520%257D%2520%257D%2520fragment%2520FacetCollectionInfo\
        %2520on%2520FacetCollectionInfo%2520%257B%2520page%2520total_pages%2520%257D%2520&\
        variables=%7B%22input%22%3A%7B%22filters%22%3A%5B%7B%22name%22%3A%22album_id%22%2C%22value%22%3A%22__album__id__\
        %22%7D%5D%2C%22display%22%3A%22position%22%2C%22items_per_page%22%3A50%2C%22page%22%3A__page__number__%7D%7D";
        let url: String = data
            .replace("__album__id__", &manga)
            .replace("__page__number__", "1");
        let mut client: Option<Client> = None;
        let (response, new_client) = self.send_simple_request(&url, client).await?;
        client = Some(new_client);
        let response: Value = response.json().await?;
        let total_pages: i64 = response["data"]["picture"]["list"]["info"]["total_pages"]
            .as_i64()
            .ok_or_else(|| AppError::parser(&manga, "total_pages"))?;
        let mut images: Vec<String> = response["data"]["picture"]["list"]["items"]
            .as_array()
            .ok_or_else(|| AppError::parser(&manga, "images"))?
            .iter()
            .map(|item: &Value| item["url_to_original"].to_string())
            .collect();
        for page in 2..=total_pages {
            let url: String = data
                .replace("__album__id__", &manga)
                .replace("__page__number__", &page.to_string());
            let (response, new_client) = self.send_simple_request(&url, client).await?;
            client = Some(new_client);
            let response: Value = response.json().await?;
            let new_images: Vec<String> = response["data"]["picture"]["list"]["items"]
                .as_array()
                .ok_or_else(|| AppError::parser(&manga, "images"))?
                .iter()
                .map(|item: &Value| item["url_to_original"].to_string())
                .collect();
            images.extend(new_images);
        }
        Ok((images, to_value(false).unwrap_or_default()))
    }

    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Result<Vec<HashMap<String, String>>, AppError> {
        let data: &str = "https://apicdn.luscious.net/graphql/nobatch/?operationName=AlbumList&\
        query=%2520query%2520AlbumList%28%2524input%253A%2520AlbumListInput%21%29%2520%257B%2520album%2520%257B%2520list\
        %28input%253A%2520%2524input%29%2520%257B%2520info%2520%257B%2520...\
        FacetCollectionInfo%2520%257D%2520items%2520%257B%2520...\
        AlbumInSearchList%2520%257D%2520%257D%2520%257D%2520%257D%2520fragment%2520FacetCollectionInfo%2520on\
        %2520FacetCollectionInfo%2520%257B%2520total_pages\
        %2520%257D%2520fragment%2520AlbumInSearchList%2520on%2520Album%2520%257B%2520__typename\
        %2520id%2520title%2520%257D%2520&variables=%7B%22input%22%3A%7B%22items_per_page\
        %22%3A30%2C%22display%22%3A%22search_score%22%2C%22filters%22%3A%5B%7B%22name%22%3A%22album_type\
        %22%2C%22value%22%3A%22manga%22%7D%2C%7B%22name%22%3A%22audience_ids\
        %22%2C%22value%22%3A%22%2B1%2B3%2B5%22%7D%2C%7B%22name%22%3A%22language_ids\
        %22%2C%22value%22%3A%22%2B1%2B100%2B101%2B2%2B3%2B4%2B5%2B6%2B8%2B9%2B99%22%7D%2C%7B%22name%22%3A%22search_query\
        %22%2C%22value%22%3A%22__keyword__%22%7D%5D%2C%22page%22%3A__page__number__%7D%7D";
        let mut total_pages: u32 = 1000;
        let mut page: u32 = 1;
        let mut results: Vec<HashMap<String, String>> = Vec::new();
        let mut client: Option<Client> = None;
        while page <= page_limit {
            if page > total_pages {
                break;
            }
            let url: String = data
                .replace("__keyword__", &keyword)
                .replace("__page__number__", &page.to_string());
            let (response, new_client) = self.send_simple_request(&url, client).await?;
            client = Some(new_client);
            if !response.status().is_success() {
                break;
            }
            let response: Value = response.json().await?;
            total_pages = response["data"]["album"]["list"]["info"]["total_pages"]
                .as_i64()
                .ok_or_else(|| AppError::parser(&url, "total_pages"))?
                as u32;
            let doujins: &Vec<Value> = response["data"]["album"]["list"]["items"]
                .as_array()
                .ok_or_else(|| AppError::parser(&url, "items"))?;
            for doujin in doujins {
                let Some(title) = doujin.get("title") else {
                    continue;
                };
                let title: String = title.to_string();
                if absolute && !title.to_lowercase().contains(&keyword.to_lowercase()) {
                    continue;
                }
                let Some(code) = doujin.get("id") else {
                    continue;
                };
                let mut result: HashMap<String, String> = HashMap::from([
                    ("name".to_string(), title),
                    ("domain".to_string(), self.base.domain.to_string()),
                    ("code".to_string(), code.to_string()),
                    ("page".to_string(), page.to_string()),
                ]);
                doujin["tags"].as_array().map(|tags: &Vec<Value>| {
                    result.insert(
                        "tags".to_string(),
                        tags.iter()
                            .filter_map(|tag: &Value| {
                                tag.get("text").map(|text: &Value| text.to_string())
                            })
                            .collect::<Vec<_>>()
                            .join(", "),
                    )
                });
                doujin["genres"].as_array().map(|tags: &Vec<Value>| {
                    result.insert(
                        "genres".to_string(),
                        tags.iter()
                            .filter_map(|tag: &Value| {
                                tag.get("text").map(|text: &Value| text.to_string())
                            })
                            .collect::<Vec<_>>()
                            .join(", "),
                    )
                });
                doujin["cover"].get("url").and_then(|cover: &Value| {
                    result.insert("thumbnail".to_string(), cover.to_string())
                });
                results.push(result);
            }
            page += 1;
            self.sleep(sleep_time);
        }
        Ok(results)
    }
}
impl Luscious {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Doujin",
                domain: "luscious.net",
                logo: "https://www.luscious.net/assets/logo.png",
                sample: HashMap::from([("code", "505726"), ("keyword", "solo")]),
                searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
