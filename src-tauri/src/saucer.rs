use indexmap::IndexMap;
use reqwest::{header, multipart, Client, RequestBuilder};
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::Value;
use std::{collections::HashMap, ffi::OsStr, io::Error, path::PathBuf};
use tokio::fs::read;

use crate::errors::AppError;

pub async fn yandex(url: String) -> Result<Vec<HashMap<String, String>>, AppError> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!(
        "https://yandex.com/images/search?rpt=imageview&url={url}"
    ));
    let document: Document = Document::from(request.send().await?.text().await?.as_str());
    let data_raw: &str = document
        .find(Name("div").and(Attr("class", "cbir-section cbir-section_name_sites")))
        .find_map(|node: Node<'_>| {
            node.find(Name("div").and(Class("Root")))
                .next()
                .and_then(|node: Node<'_>| node.attr("data-state"))
        })
        .ok_or_else(|| AppError::parser(&url, "data-state attribute"))?;
    let data: IndexMap<String, Value> = serde_json::from_str(&data_raw)?;
    let sites: &Vec<Value> = data["sites"]
        .as_array()
        .ok_or_else(|| AppError::SerdeJsonError(format!("{url}: saucer: unable to find sites")))?;
    sites
        .into_iter()
        .map(|site: &Value| {
            let url: String = site["url"].to_string();
            let image: String = site["originalImage"]["url"].to_string();
            Ok(HashMap::from([
                ("url".to_string(), url),
                ("image".to_string(), image),
            ]))
        })
        .collect()
}

pub async fn tineye(url: String) -> Result<Vec<HashMap<String, String>>, AppError> {
    let data: String = format!("------WebKitFormBoundaryVxauFLsZbD7Cr1Fa\n\
    Content-Disposition: form-data; name=\"url\"\n\n{url}\n------WebKitFormBoundaryVxauFLsZbD7Cr1Fa--");
    let mut headers: header::HeaderMap = header::HeaderMap::new();
    headers.append(
        "content-type",
        header::HeaderValue::from_str(
            "multipart/form-data; boundary=----WebKitFormBoundaryVxauFLsZbD7Cr1Fa",
        )
        .map_err(|err: header::InvalidHeaderValue| {
            AppError::ReqwestError(format!("{url}: saucer, invalid header: {err}"))
        })?,
    );
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client
        .post("https://tineye.com/result_json/?sort=score&order=desc&page=1")
        .headers(headers.to_owned())
        .body(data.to_owned());
    let mut response: Value = request.send().await?.json().await?;
    let total_pages: i64 = response["total_pages"].as_i64().ok_or_else(|| {
        AppError::SerdeJsonError(format!("{url}: saucer: unable to find total_pages"))
    })?;
    let mut matches: Vec<Value> = response["matches"]
        .as_array()
        .ok_or_else(|| AppError::SerdeJsonError(format!("{url}: saucer: unable to find matches")))?
        .to_vec();
    for i in 2..=total_pages {
        response = client
            .post(&format!(
                "https://tineye.com/result_json/?sort=score&order=desc&page={i}"
            ))
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
                    AppError::SerdeJsonError(format!("{url}: saucer: unable to find matches"))
                })?
                .to_vec(),
        );
    }
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    for match_ in matches {
        let domains: &Vec<Value> = match_["domains"].as_array().ok_or_else(|| {
            AppError::SerdeJsonError(format!("{url}: saucer: unable to find domains"))
        })?;
        for domain in domains {
            let backlinks: &Vec<Value> = domain["backlinks"].as_array().ok_or_else(|| {
                AppError::SerdeJsonError(format!("{url}: saucer: unable to find backlinks"))
            })?;
            for backlink in backlinks {
                let mut map: HashMap<String, String> = HashMap::new();
                map.insert("url".to_string(), backlink["backlink"].to_string());
                map.insert("image".to_string(), backlink["url"].to_string());
                results.push(map);
            }
        }
    }
    Ok(results)
}

pub async fn iqdb(url: String) -> Result<Vec<HashMap<String, String>>, AppError> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!("https://iqdb.org/?url={url}"));
    let document: Document = Document::from(request.send().await?.text().await?.as_str());
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    let divs: Vec<Node> = document
        .find(Name("div").and(Attr("id", "pages")))
        .find_map(|node: Node<'_>| {
            Some(
                node.find(Name("div"))
                    .filter(|div: &Node| !div.text().contains("Your image"))
                    .collect(),
            )
        })
        .ok_or_else(|| AppError::parser(&url, "images"))?;
    divs.into_iter().for_each(|div: Node<'_>| {
        div.find(Name("td").and(Class("image")))
            .find_map(|td: Node<'_>| {
                td.find(Name("a")).next().map(|td_a: Node<'_>| {
                    let Some(td_url) = td_a.attr("href") else {
                        return;
                    };
                    let mut td_url: String = td_url.to_string();
                    if !td_url.contains("https:") {
                        td_url = format!("https:{td_url}");
                    }
                    let mut map: HashMap<String, String> = HashMap::new();
                    map.insert("url".to_string(), td_url);
                    td.find(Name("img")).next().map(|image: Node<'_>| {
                        image.attr("src").and_then(|src| {
                            let mut image_src: String = src.to_string();
                            if !image_src.contains("https:") {
                                image_src = format!("https://iqdb.org{image_src}");
                            }
                            map.insert("image".to_string(), image_src)
                        });
                    });
                    results.push(map);
                })
            });
    });
    Ok(results)
}

pub async fn saucenao(url: String) -> Result<Vec<HashMap<String, String>>, AppError> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder =
        client.get(&format!("https://saucenao.com/search.php?db=999&url={url}"));
    let document: Document = Document::from(request.send().await?.text().await?.as_str());
    let divs: Vec<Node> = document
        .find(Name("div").and(Attr("id", "middle")))
        .next()
        .and_then(|node: Node<'_>| Some(node.find(Name("div").and(Class("result"))).collect()))
        .ok_or_else(|| AppError::parser(&url, "images"))?;
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    for div in divs {
        if div.text().contains("Low similarity results have been") {
            break;
        }
        div.find(Name("div").and(Class("resultimage")))
            .next()
            .and_then(|result: Node<'_>| {
                result.find(Name("a")).next().and_then(|a: Node<'_>| {
                    a.attr("href").map(|href: &str| {
                        results.push(HashMap::from([("url".to_string(), href.to_string())]));
                    })
                })
            });
    }
    Ok(results)
}

pub async fn upload(path: &str) -> Result<String, AppError> {
    let client: Client = Client::builder().build()?;
    let path_buf: PathBuf = PathBuf::from(path);
    let bytes: Vec<u8> = read(&path_buf)
        .await
        .map_err(|err: Error| AppError::file("read", &path_buf, err))?;
    let form: multipart::Form = multipart::Form::new().part(
        "photo",
        multipart::Part::stream(bytes).file_name(
            path_buf
                .file_name()
                .and_then(|name: &OsStr| name.to_str())
                .ok_or_else(|| AppError::FileOperation(format!("{path}: Invalid image filename")))?
                .to_string(),
        ),
    );
    let response = client
        .post("https://imgops.com/store")
        .multipart(form)
        .send();
    let document: Document = Document::from(response.await?.text().await?.as_str());
    let link: &str = document
        .find(Name("div").and(Attr("id", "content")))
        .find_map(|node: Node<'_>| {
            node.find(Name("a"))
                .next()
                .and_then(|node: Node<'_>| node.attr("href"))
        })
        .ok_or_else(|| AppError::parser(&path, "link"))?;
    Ok(format!("https:{link}"))
}
