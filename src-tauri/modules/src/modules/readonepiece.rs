use reqwest::header::HeaderMap;

use crate::prelude::*;

pub struct Readonepiece {
    base: BaseModule,
}

#[async_trait]
impl Module for Readonepiece {
    fn base(&self) -> &BaseModule {
        &self.base
    }
    async fn get_webtoon_url(&self, manga: String) -> Result<String> {
        Ok(format!("https://ww9.readonepiece.com/manga/{manga}/"))
    }
    async fn get_chapter_url(&self, manga: String, chapter: String) -> Result<String> {
        Ok(format!(
            "https://ww9.readonepiece.com/chapter/{manga}-{chapter}"
        ))
    }
    async fn get_info(&self, manga: String) -> Result<ValueHashMap> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let mut info: ValueHashMap = HashMap::new();
        document
            .find(Name("div").and(Attr("class", "py-4 px-6 mb-3")))
            .next()
            .and_then(|element: Node| {
                element.find(Name("img")).next().and_then(|element: Node| {
                    element
                        .attr("src")
                        .and_then(|src: &str| insert!(info, "Cover", src))
                });
                element
                    .find(Name("div").and(Class("text-text-muted")))
                    .next()
                    .and_then(|element: Node| insert!(info, "Summary", element.text().trim()))
            });
        document
            .find(Name("h1").and(Attr("class", "my-3 font-bold text-2xl md:text-3xl")))
            .next()
            .and_then(|element: Node| insert!(info, "Title", element.text().trim()));
        Ok(info)
    }

    async fn get_images(&self, manga: String, chapter: String) -> Result<(Vec<String>, Value)> {
        let url: String = format!("https://ww9.readonepiece.com/chapter/{manga}-{chapter}");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        let images: Vec<String> = document
            .find(Name("img").and(Attr("class", "mb-3 mx-auto js-page")))
            .map(|image: Node| {
                Ok(image
                    .attr("src")
                    .ok_or_else(|| Error::parser(&url, "Invalid image attr"))?
                    .to_owned())
            })
            .collect::<Result<Vec<String>>>()?;
        Ok((images, Value::Bool(false)))
    }

    async fn get_chapters(&self, manga: String) -> Result<Vec<BasicHashMap>> {
        let url: String = format!("https://ww9.readonepiece.com/manga/{manga}/");
        let (response, _) = self.send_simple_request(&url, None).await?;
        let document: Document = Document::from(response.text().await?.as_str());
        Ok(document
            .find(Name("div").and(Attr("class", "bg-bg-secondary p-3 rounded mb-3 shadow")))
            .filter_map(|div: Node| {
                div.find(Name("a")).next().and_then(|a: Node| {
                    a.attr("href").and_then(|href: &str| {
                        let group: Vec<&str> = href.rsplit('/').collect();
                        if group.len() < 2 {
                            return None;
                        }
                        let binding: String = group[1].replace(&format!("{manga}-"), "");
                        let chapter: &str = binding.as_str();
                        Some(HashMap::from([
                            ("url".to_owned(), chapter.to_owned()),
                            ("name".to_owned(), self.rename_chapter(chapter.to_owned())),
                        ]))
                    })
                })
            })
            .collect())
    }
}

impl Readonepiece {
    pub fn new() -> Self {
        Self {
            base: BaseModule {
                type_: "Manga",
                domain: "readonepiece.com",
                logo: "https://ww9.readonepiece.com/apple-touch-icon.png",
                download_image_headers: HeaderMap::new(),
                sample: HashMap::from([("manga", "one-piece-digital-colored-comics")]),
                ..BaseModule::default()
            },
        }
    }
}
