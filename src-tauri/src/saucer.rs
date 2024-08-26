use reqwest::{
    header::{HeaderMap, HeaderValue},
    multipart::{Form, Part},
    Client, RequestBuilder,
};
use scraper::{element_ref::Select, Html, Selector};
use serde_json::Value;
use std::{collections::HashMap, error::Error, fs::File, io::Read};

async fn yandex(url: &str) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!(
        "https://yandex.com/images/search?rpt=imageview&url={}",
        url
    ));
    let response = request.send();
    let document = Html::parse_document(&response.await?.text().await?);
    let selector = Selector::parse("div.cbir-section.cbir-section_name_sites div.Root")?;
    let data_raw = document
        .select(&selector)
        .next()
        .ok_or("Failed to find cbir-section")?
        .value()
        .attr("data-state")
        .ok_or("Failed to find data-state attribute")?;
    let data: Value = Value::String(data_raw.to_string());
    let sites: &Vec<Value> = data["sites"]
        .as_array()
        .ok_or("Failed to get sites array")?;
    sites
        .iter()
        .map(|site| {
            let url = site["url"].as_str().ok_or("Failed to get url")?.to_string();
            let image = site["originalImage"]["url"]
                .as_str()
                .ok_or("Failed to get originalImage url")?
                .to_string();
            let mut map = HashMap::new();
            map.insert("url".to_string(), url);
            map.insert("image".to_string(), image);
            Ok(map)
        })
        .collect::<Result<Vec<_>, _>>()
}

async fn tineye(url: &str) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let data: String = format!("------WebKitFormBoundaryVxauFLsZbD7Cr1Fa\nContent-Disposition: form-data; name=\"url\"\n\n{}\n------WebKitFormBoundaryVxauFLsZbD7Cr1Fa--", url);
    // let client: Client = Client::new();
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
                let mut map = HashMap::new();
                map.insert(
                    "url".to_string(),
                    backlink["backlink"].as_str().unwrap().to_string(),
                );
                map.insert(
                    "image".to_string(),
                    backlink["url"].as_str().unwrap().to_string(),
                );
                results.push(map);
            }
        }
    }
    Ok(results)
}

async fn iqdb(url: &str) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!("https://iqdb.org/?url={}", url));
    let response = request.send();
    let document: Html = Html::parse_document(&response.await?.text().await?);
    let pages_selector: Selector = Selector::parse("div#pages")?;
    let div_selector: Selector = Selector::parse("div")?;
    let divs = document
        .select(&pages_selector)
        .next()
        .unwrap()
        .select(&div_selector)
        .filter(|div| {
            !div.text()
                .collect::<Vec<_>>()
                .join(" ")
                .contains("Your image")
        });
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    for div in divs {
        let td_selector = Selector::parse("td.image")?;
        let a_selector = Selector::parse("a")?;
        let img_selector = Selector::parse("img")?;
        if let Some(td) = div.select(&td_selector).next() {
            if let Some(td_url) = td
                .select(&a_selector)
                .next()
                .and_then(|a| a.value().attr("href"))
            {
                let td_image = td
                    .select(&img_selector)
                    .next()
                    .and_then(|img| img.value().attr("src"));
                let mut map = HashMap::new();
                map.insert("url".to_string(), format!("https:{}", td_url));
                if let Some(image) = td_image {
                    map.insert("image".to_string(), format!("https://iqdb.org{}", image));
                }
                results.push(map);
            }
        }
    }
    Ok(results)
}

async fn saucenao(url: &str) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    let client: Client = Client::builder().build()?;
    let request: RequestBuilder = client.get(&format!(
        "https://saucenao.com/search.php?db=999&url={}",
        url
    ));
    let response = request.send();
    let document: Html = Html::parse_document(&response.await?.text().await?);
    let middle_selector: Selector = Selector::parse("div#middle")?;
    let result_selector: Selector = Selector::parse("div.result")?;
    let resultimage_selector: Selector = Selector::parse("div.resultimage")?;
    let a_selector: Selector = Selector::parse("a")?;
    let divs: Select = document
        .select(&middle_selector)
        .next()
        .unwrap()
        .select(&result_selector);
    let mut results: Vec<HashMap<String, String>> = Vec::new();
    for div in divs {
        if div
            .text()
            .collect::<Vec<_>>()
            .join(" ")
            .contains("Low similarity results have been hidden")
        {
            break;
        }
        if let Some(a) = div
            .select(&resultimage_selector)
            .next()
            .and_then(|div| div.select(&a_selector).next())
        {
            let mut map = HashMap::new();
            map.insert(
                "url".to_string(),
                a.value().attr("href").unwrap().to_string(),
            );
            results.push(map);
        }
    }
    Ok(results)
}

#[tauri::command]
pub async fn sauce(saucer: String, url: String) -> Vec<HashMap<String, String>> {
    match saucer.as_str() {
        "yandex" => yandex(url.as_str()).await.unwrap_or_default(),
        "tineye" => tineye(url.as_str()).await.unwrap_or_default(),
        "iqdb" => iqdb(url.as_str()).await.unwrap_or_default(),
        "saucenao" => saucenao(url.as_str()).await.unwrap_or_default(),
        _ => Vec::new(),
    }
}

async fn upload(path: &str) -> Result<String, Box<dyn Error>> {
    let mut file: File = File::open(path)?;
    let mut bytes: Vec<u8> = Vec::new();
    file.read_to_end(&mut bytes)?;
    let part: Part = Part::bytes(bytes);
    let form: Form = Form::new().part("photo", part);
    let client: Client = Client::builder().build()?;
    let response: String = client
        .post("https://imgops.com/store")
        .multipart(form)
        .send()
        .await?
        .text()
        .await?;
    let document: Html = Html::parse_document(&response);
    let content_selector: Selector = Selector::parse("div#content")?;
    let a_selector: Selector = Selector::parse("a")?;
    let link: &str = document
        .select(&content_selector)
        .next()
        .unwrap()
        .select(&a_selector)
        .next()
        .unwrap()
        .value()
        .attr("href")
        .unwrap();
    Ok(format!("https:{}", link))
}

#[tauri::command]
pub async fn upload_image(path: String) -> String {
    upload(path.as_str()).await.unwrap_or_default()
}

#[tauri::command]
pub fn get_saucers_list() -> Vec<String> {
    vec![
        "yandex".to_string(),
        "tineye".to_string(),
        "iqdb".to_string(),
        "saucenao".to_string(),
    ]
}
