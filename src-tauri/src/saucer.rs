use indexmap::IndexMap;
use reqwest::{
    header::{HeaderMap, HeaderValue},
    multipart::{Form, Part},
    Client, RequestBuilder,
};
use select::{
    document::Document,
    node::Node,
    predicate::{Attr, Class, Name, Predicate},
};
use serde_json::Value;
use std::{collections::HashMap, error::Error, path::Path};
use tokio::fs::read;

pub async fn yandex(url: String) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!(
        "https://yandex.com/images/search?rpt=imageview&url={}",
        url
    ));
    let document: Document = Document::from(request.send().await?.text().await?.as_str());
    let data_raw: &str = document
        .find(Name("div").and(Attr("class", "cbir-section cbir-section_name_sites")))
        .next()
        .unwrap()
        .find(Name("div").and(Class("Root")))
        .next()
        .unwrap()
        .attr("data-state")
        .unwrap();
    let data: IndexMap<String, Value> = serde_json::from_str(&data_raw)?;
    let sites: &Vec<Value> = data["sites"].as_array().unwrap();
    sites
        .iter()
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

pub async fn tineye(url: String) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let data: String = format!("------WebKitFormBoundaryVxauFLsZbD7Cr1Fa\nContent-Disposition: form-data; name=\"url\"\n\n{}\n------WebKitFormBoundaryVxauFLsZbD7Cr1Fa--", url);
    let mut headers: HeaderMap = HeaderMap::new();
    headers.append(
        "content-type",
        HeaderValue::from_str(
            "multipart/form-data; boundary=----WebKitFormBoundaryVxauFLsZbD7Cr1Fa",
        )?,
    );
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client
        .post("https://tineye.com/result_json/?sort=score&order=desc&page=1")
        .headers(headers.clone())
        .body(data.clone());
    let mut response: Value = request.send().await?.json().await?;
    let total_pages: i64 = response["total_pages"].as_i64().unwrap();
    let mut matches: Vec<Value> = response["matches"].as_array().unwrap().to_vec();
    for i in 2..=total_pages {
        response = client
            .post(&format!(
                "https://tineye.com/result_json/?sort=score&order=desc&page={}",
                i
            ))
            .headers(headers.clone())
            .body(data.clone())
            .send()
            .await?
            .json()
            .await?;
        matches.extend(response["matches"].as_array().unwrap().to_vec());
    }
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    for match_ in matches {
        for domain in match_["domains"].as_array().unwrap() {
            for backlink in domain["backlinks"].as_array().unwrap() {
                let mut map: HashMap<String, String> = HashMap::new();
                map.insert(
                    "url".to_string(),
                    backlink["backlink"].to_string(),
                );
                map.insert(
                    "image".to_string(),
                    backlink["url"].to_string(),
                );
                results.push(map);
            }
        }
    }
    Ok(results)
}

pub async fn iqdb(url: String) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!("https://iqdb.org/?url={}", url));
    let document: Document = Document::from(request.send().await?.text().await?.as_str());
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    let divs: Vec<Node> = document
        .find(Name("div").and(Attr("id", "pages")))
        .next()
        .unwrap()
        .find(Name("div"))
        .filter(|div: &Node| !div.text().contains("Your image"))
        .collect();
    for div in divs {
        if let Some(td) = div.find(Name("td").and(Class("image"))).next() {
            if let Some(td_a) = td.find(Name("a")).next() {
                let mut td_url: String = td_a.attr("href").unwrap().to_string();
                if !td_url.contains("https:") {
                    td_url = format!("https:{}", td_url);
                }
                let mut map: HashMap<String, String> = HashMap::new();
                map.insert("url".to_string(), td_url);
                if let Some(image) = td.find(Name("img")).next() {
                    let mut image_src: String = image.attr("src").unwrap().to_string();
                    if !image_src.contains("https:") {
                        image_src = format!("https://iqdb.org{}", image_src);
                    }
                    map.insert(
                        "image".to_string(),
                        format!("https://iqdb.org{}", image_src),
                    );
                }
                results.push(map);
            }
        }
    }
    Ok(results)
}

pub async fn saucenao(url: String) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!(
        "https://saucenao.com/search.php?db=999&url={}",
        url
    ));
    let document: Document = Document::from(request.send().await?.text().await?.as_str());
    let divs: Vec<Node> = document
        .find(Name("div").and(Attr("id", "middle")))
        .next()
        .unwrap()
        .find(Name("div").and(Class("result")))
        .collect();
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    for div in divs {
        if div.text().contains("Low similarity results have been") {
            break;
        }
        if let Some(result) = div.find(Name("div").and(Class("resultimage"))).next() {
            if let Some(a) = result.find(Name("a")).next() {
                results.push(HashMap::from([(
                    "url".to_string(),
                    a.attr("href").unwrap().to_string(),
                )]));
            }
        }
    }
    Ok(results)
}

pub async fn upload(path: String) -> Result<String, Box<dyn Error>> {
    let client: Client = Client::builder().build()?;
    let bytes: Vec<u8> = read(path.clone()).await?;
    let form: Form = Form::new().part(
        "photo",
        Part::stream(bytes).file_name(
            Path::new(&path)
                .file_name()
                .unwrap()
                .to_str()
                .unwrap()
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
        .next()
        .unwrap()
        .find(Name("a"))
        .next()
        .unwrap()
        .attr("href")
        .unwrap();
    Ok(format!("https:{}", link))
}
