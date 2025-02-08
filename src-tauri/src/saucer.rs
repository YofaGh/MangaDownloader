use indexmap::IndexMap;
use reqwest::{get, header, multipart, Client, RequestBuilder, Response};
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::Value;
use std::{collections::HashMap, ffi::OsStr, fs::read, io::Error as IoError, path::PathBuf};

use crate::prelude::*;

pub async fn yandex(url: String) -> Result<Vec<BasicHashMap>> {
    let response: Response = get(&format!(
        "https://yandex.com/images/search?rpt=imageview&url={url}"
    ))
    .await?;
    let document: Document = Document::from(response.text().await?.as_str());
    let data_raw: &str = document
        .find(Name("div").and(Attr("class", "cbir-section cbir-section_name_sites")))
        .find_map(|node: Node| {
            node.find(Name("div").and(Class("Root")))
                .next()
                .and_then(|node: Node| node.attr("data-state"))
        })
        .ok_or_else(|| Error::parser(&url, "data-state attribute"))?;
    let data: IndexMap<String, Value> = serde_json::from_str(data_raw)?;
    let sites: &Vec<Value> = data["sites"]
        .as_array()
        .ok_or_else(|| Error::SerdeJsonErr(format!("{url}: saucer: unable to find sites")))?;
    sites
        .iter()
        .map(|site: &Value| {
            Ok(HashMap::from([
                ("url".to_owned(), site["url"].to_string()),
                ("image".to_owned(), site["originalImage"]["url"].to_string()),
            ]))
        })
        .collect()
}

pub async fn tineye(url: String) -> Result<Vec<BasicHashMap>> {
    let data: String = format!("------WebKitFormBoundaryVxauFLsZbD7Cr1Fa\n\
    Content-Disposition: form-data; name=\"url\"\n\n{url}\n------WebKitFormBoundaryVxauFLsZbD7Cr1Fa--");
    let mut headers: header::HeaderMap = header::HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        header::HeaderValue::from_static(
            "multipart/form-data; boundary=----WebKitFormBoundaryVxauFLsZbD7Cr1Fa",
        ),
    );
    let client: Client = Client::builder().build()?;
    let base_url: &str = "https://tineye.com/result_json/?sort=score&order=desc&page=";
    let request: RequestBuilder = client
        .post(format!("{base_url}1"))
        .headers(headers.to_owned())
        .body(data.to_owned());
    let mut response: Value = request.send().await?.json().await?;
    let total_pages: i64 = response["total_pages"]
        .as_i64()
        .ok_or_else(|| Error::SerdeJsonErr(format!("{url}: saucer: unable to find total_pages")))?;
    let mut matches: Vec<Value> = response["matches"]
        .as_array()
        .ok_or_else(|| Error::SerdeJsonErr(format!("{url}: saucer: unable to find matches")))?
        .to_vec();
    for i in 2..=total_pages {
        response = client
            .post(format!("{base_url}{i}"))
            .headers(headers.to_owned())
            .body(data.to_owned())
            .send()
            .await?
            .json()
            .await?;
        matches.extend(
            response["matches"]
                .as_array()
                .ok_or_else(|| {
                    Error::SerdeJsonErr(format!("{url}: saucer: unable to find matches"))
                })?
                .to_vec(),
        );
    }
    let mut results: Vec<BasicHashMap> = Vec::new();
    for match_ in matches {
        let domains: &Vec<Value> = match_["domains"]
            .as_array()
            .ok_or_else(|| Error::SerdeJsonErr(format!("{url}: saucer: unable to find domains")))?;
        for domain in domains {
            let backlinks: &Vec<Value> = domain["backlinks"].as_array().ok_or_else(|| {
                Error::SerdeJsonErr(format!("{url}: saucer: unable to find backlinks"))
            })?;
            backlinks.iter().for_each(|backlink: &Value| {
                results.push(HashMap::from([
                    ("url".to_owned(), backlink["backlink"].to_string()),
                    ("image".to_owned(), backlink["url"].to_string()),
                ]));
            });
        }
    }
    Ok(results)
}

pub async fn iqdb(url: String) -> Result<Vec<BasicHashMap>> {
    let response: Response = get(&format!("https://iqdb.org/?url={url}")).await?;
    let document: Document = Document::from(response.text().await?.as_str());
    let mut results: Vec<BasicHashMap> = Vec::new();
    let divs: Vec<Node> = document
        .find(Name("div").and(Attr("id", "pages")))
        .map(|node: Node| {
            node.find(Name("div"))
                .filter(|div: &Node| !div.text().contains("Your image"))
                .collect()
        })
        .next()
        .ok_or_else(|| Error::parser(&url, "images"))?;
    divs.into_iter().for_each(|div: Node| {
        div.find(Name("td").and(Class("image")))
            .find_map(|td: Node| {
                td.find(Name("a")).next().map(|td_a: Node| {
                    let Some(td_url) = td_a.attr("href") else {
                        return;
                    };
                    let mut td_url: String = td_url.to_owned();
                    if !td_url.contains("https:") {
                        td_url = format!("https:{td_url}");
                    }
                    let mut map: BasicHashMap = HashMap::new();
                    map.insert("url".to_owned(), td_url);
                    if let Some(image) = td.find(Name("img")).next() {
                        image.attr("src").and_then(|src: &str| {
                            let mut image_src: String = src.to_owned();
                            if !image_src.contains("https:") {
                                image_src = format!("https://iqdb.org{image_src}");
                            }
                            map.insert("image".to_owned(), image_src)
                        });
                    }
                    results.push(map);
                })
            });
    });
    Ok(results)
}

pub async fn saucenao(url: String) -> Result<Vec<BasicHashMap>> {
    let response: Response =
        get(&format!("https://saucenao.com/search.php?db=999&url={url}")).await?;
    let document: Document = Document::from(response.text().await?.as_str());
    let divs: Vec<Node> = document
        .find(Name("div").and(Attr("id", "middle")))
        .next()
        .map(|node: Node| node.find(Name("div").and(Class("result"))).collect())
        .ok_or_else(|| Error::parser(&url, "images"))?;
    let mut results: Vec<BasicHashMap> = Vec::new();
    for div in divs {
        if div.text().contains("Low similarity results have been") {
            break;
        }
        div.find(Name("div").and(Class("resultimage")))
            .next()
            .and_then(|result: Node| {
                result.find(Name("a")).next().and_then(|a: Node| {
                    a.attr("href").map(|href: &str| {
                        results.push(HashMap::from([("url".to_owned(), href.to_owned())]));
                    })
                })
            });
    }
    Ok(results)
}

pub async fn upload(path: &str) -> Result<String> {
    let client: Client = Client::builder().build()?;
    let path_buf: PathBuf = PathBuf::from(path);
    let bytes: Vec<u8> =
        read(&path_buf).map_err(|err: IoError| Error::file("read", &path_buf, err))?;
    let form: multipart::Form = multipart::Form::new().part(
        "photo",
        multipart::Part::stream(bytes).file_name(
            path_buf
                .file_name()
                .and_then(|name: &OsStr| name.to_str())
                .ok_or_else(|| Error::FileOperation(format!("{path}: Invalid image filename")))?
                .to_owned(),
        ),
    );
    let response = client
        .post("https://imgops.com/store")
        .multipart(form)
        .send();
    let document: Document = Document::from(response.await?.text().await?.as_str());
    let link: &str = document
        .find(Name("div").and(Attr("id", "content")))
        .find_map(|node: Node| {
            node.find(Name("a"))
                .next()
                .and_then(|node: Node| node.attr("href"))
        })
        .ok_or_else(|| Error::parser(path, "link"))?;
    Ok(format!("https:{link}"))
}

pub async fn sauce(saucer: String, url: String) -> Result<Vec<BasicHashMap>> {
    match saucer.as_str() {
        "yandex" => yandex(url).await,
        "tineye" => tineye(url).await,
        "iqdb" => iqdb(url).await,
        "saucenao" => saucenao(url).await,
        _ => Ok(Vec::new()),
    }
}

pub fn get_saucers_list() -> Vec<String> {
    vec!["yandex", "tineye", "iqdb", "saucenao"]
        .into_iter()
        .map(|s: &str| s.to_owned())
        .collect()
}
