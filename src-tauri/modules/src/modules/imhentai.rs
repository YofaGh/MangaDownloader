use indexmap::IndexMap;

use crate::prelude::*;

pub struct Imhentai {
    base: BaseModule,
}

#[async_trait]
impl Module for Imhentai {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_webtoon_url(&self, code: String) -> Result<String> {
        Ok(format!("https://imhentai.xxx/gallery/{code}"))
    }
    async fn get_info(&self, code: String) -> Result<ValueHashMap> {
        let url: String = format!("https://imhentai.xxx/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: ValueHashMap = HashMap::new();
        let mut extras: ValueHashMap = HashMap::new();
        document
            .find(
                Name("div")
                    .and(Attr("class", "col-md-4 col left_cover"))
                    .descendant(Name("img")),
            )
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
            .find(Name("p").and(Class("subtitle")))
            .next()
            .and_then(|alt_element: Node| insert!(info, "Alt", alt_element.text().trim()));
        document.find(Name("li")).for_each(|element: Node| {
            if element.text().contains("Pages") {
                insert!(info, "Pages", element.text().replace("Pages: ", ""));
            } else if element.text().contains("Posted") {
                insert!(extras, "Posted", element.text().replace("Posted: ", ""));
            }
        });
        document
            .find(
                Name("ul")
                    .and(Class("galleries_info"))
                    .descendant(Name("li")),
            )
            .filter(|box_item: &Node| {
                !box_item.text().contains("Pages") && !box_item.text().contains("Posted")
            })
            .for_each(|box_item: Node| {
                box_item.find(Name("span")).next().and_then(|key: Node| {
                    let values: Vec<String> = box_item
                        .find(Name("a"))
                        .filter_map(|a: Node| a.first_child())
                        .map(|a: Node| a.text().trim().to_owned())
                        .collect();
                    insert!(extras, key.text().trim_end_matches(':'), values)
                });
            });
        insert!(info, "Extras", extras);
        Ok(info)
    }

    async fn get_images(&self, code: String, _: String) -> Result<(Vec<String>, Value)> {
        let image_formats: HashMap<&str, &str> = HashMap::from([
            ("j", "jpg"),
            ("p", "png"),
            ("b", "bmp"),
            ("g", "gif"),
            ("w", "webp"),
        ]);
        let url: String = format!("https://imhentai.xxx/gallery/{code}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let path: &str = (|| {
            let img: Node = document
                .find(
                    Name("div")
                        .and(Attr("id", "append_thumbs"))
                        .descendant(Name("img")),
                )
                .next()?;
            let src: &str = img.attr("data-src")?;
            let (path, _) = src.rsplit_once("/")?;
            Some(path)
        })()
        .ok_or_else(|| Error::parser(&url, "failed to get path"))?;
        let script: String = document
            .find(|n: &Node| n.name() == Some("script") && n.text().contains("var g_th"))
            .next()
            .ok_or_else(|| Error::parser(&code, "script var g_th"))?
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
                .ok_or_else(|| Error::parser(&url, "Invalid image filename format"))
            })
            .collect::<Result<Vec<String>>>()?;
        Ok((image_urls, Value::Bool(false)))
    }

    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Result<Vec<BasicHashMap>> {
        let mut results: Vec<BasicHashMap> = Vec::new();
        let mut page: u32 = 1;
        let mut client: Option<Client> = None;
        while page <= page_limit {
            let url: String = format!("https://imhentai.xxx/search/?key={keyword}&page={page}");
            let (response, new_client) = match self.send_simple_request(&url, client).await {
                Ok(result) => result,
                Err(_) => return Ok(results),
            };
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
                    .find(Name("div").and(Class("caption")).descendant(Name("a")))
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
                let mut result: BasicHashMap =
                    search_map!(title, self.base.domain, "code", code[1], page);
                doujin
                    .find(
                        Name("div")
                            .and(Class("inner_thumb"))
                            .descendant(Name("img")),
                    )
                    .next()
                    .and_then(|element: Node| {
                        element.attr("data-src").and_then(|img: &str| {
                            result.insert("thumbnail".to_owned(), img.to_owned())
                        })
                    });
                doujin
                    .find(Name("a").and(Class("thumb_cat")))
                    .next()
                    .and_then(|element: Node| result.insert("category".to_owned(), element.text()));
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
                is_searchable: true,
                is_coded: true,
                ..BaseModule::default()
            },
        }
    }
}
