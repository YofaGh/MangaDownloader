use reqwest::header::{HeaderName, HeaderValue};
use scraper::{Html, Selector};
use serde_json::Value;
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;

#[tauri::command]
pub fn yandex(url: &str) -> Vec<HashMap<String, String>> {
    let response: String = reqwest::blocking::get(&format!(
        "https://yandex.com/images/search?rpt=imageview&url={}",
        url
    ))
    .unwrap()
    .text()
    .unwrap();
    let document: Html = Html::parse_document(&response);
    let selector: Selector =
        Selector::parse("div.cbir-section.cbir-section_name_sites div.Root").unwrap();
    let data_raw: &str = document
        .select(&selector)
        .next()
        .unwrap()
        .value()
        .attr("data-state")
        .unwrap();
    let data: Value = serde_json::from_str(data_raw).unwrap();
    let sites: &Vec<Value> = data["sites"].as_array().unwrap();
    sites
        .iter()
        .map(|site: &Value| {
            let url: String = site["url"].as_str().unwrap().to_string();
            let image: String = site["originalImage"]["url"].as_str().unwrap().to_string();
            let mut map: HashMap<String, String> = HashMap::new();
            map.insert("url".to_string(), url);
            map.insert("image".to_string(), image);
            map
        })
        .collect()
}

#[tauri::command]
pub fn tineye(url: &str) -> Vec<HashMap<String, String>> {
    let headers: [(&str, &str); 1] = [(
        "content-type",
        "multipart/form-data; boundary=----WebKitFormBoundaryVxauFLsZbD7Cr1Fa",
    )];
    let data: String = format!("------WebKitFormBoundaryVxauFLsZbD7Cr1Fa\nContent-Disposition: form-data; name=\"url\"\n\n{}\n------WebKitFormBoundaryVxauFLsZbD7Cr1Fa--", url);
    let client: reqwest::blocking::Client = reqwest::blocking::Client::new();
    let mut response: Value = client
        .post("https://tineye.com/result_json/?sort=score&order=desc&page=1")
        .headers(
            headers
                .into_iter()
                .map(|(k, v)| {
                    (
                        HeaderName::from_bytes(k.as_bytes()).unwrap(),
                        HeaderValue::from_str(v).unwrap(),
                    )
                })
                .collect(),
        )
        .body(data.clone())
        .send()
        .unwrap()
        .json()
        .unwrap();
    let total_pages: i64 = response["total_pages"].as_i64().unwrap();
    let mut matches: Vec<Value> = response["matches"].as_array().unwrap().to_vec();
    for i in 2..=total_pages {
        response = client
            .post(&format!(
                "https://tineye.com/result_json/?sort=score&order=desc&page={}",
                i
            ))
            .headers(
                headers
                    .into_iter()
                    .map(|(k, v)| {
                        (
                            HeaderName::from_bytes(k.as_bytes()).unwrap(),
                            HeaderValue::from_str(v).unwrap(),
                        )
                    })
                    .collect(),
            )
            .body(data.clone())
            .send()
            .unwrap()
            .json()
            .unwrap();
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
    results
}

#[tauri::command]
pub fn iqdb(url: &str) -> Vec<HashMap<String, String>> {
    let response: String = reqwest::blocking::get(&format!("https://iqdb.org/?url={}", url))
        .unwrap()
        .text()
        .unwrap();
    let document: Html = Html::parse_document(&response);
    let pages_selector: Selector = Selector::parse("div#pages").unwrap();
    let div_selector: Selector = Selector::parse("div").unwrap();
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
        let td_selector = Selector::parse("td.image").unwrap();
        let a_selector = Selector::parse("a").unwrap();
        let img_selector = Selector::parse("img").unwrap();
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
    results
}

#[tauri::command]
pub fn saucenao(url: &str) -> Vec<HashMap<String, String>> {
    let response = reqwest::blocking::get(&format!(
        "https://saucenao.com/search.php?db=999&url={}",
        url
    ))
    .unwrap()
    .text()
    .unwrap();
    let document: Html = Html::parse_document(&response);
    let middle_selector: Selector = Selector::parse("div#middle").unwrap();
    let result_selector: Selector = Selector::parse("div.result").unwrap();
    let resultimage_selector: Selector = Selector::parse("div.resultimage").unwrap();
    let a_selector: Selector = Selector::parse("a").unwrap();
    let divs: scraper::element_ref::Select = document
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
    results
}

#[tauri::command]
pub fn upload_image(path: &str) -> String {
    let mut file: File = File::open(path).unwrap();
    let mut bytes: Vec<u8> = Vec::new();
    file.read_to_end(&mut bytes).unwrap();
    let form: reqwest::blocking::multipart::Form = reqwest::blocking::multipart::Form::new()
        .file("photo", path)
        .unwrap();
    let response: String = reqwest::blocking::Client::new()
        .post("https://imgops.com/store")
        .multipart(form)
        .send()
        .unwrap()
        .text()
        .unwrap();
    let document: Html = Html::parse_document(&response);
    let content_selector: Selector = Selector::parse("div#content").unwrap();
    let a_selector: Selector = Selector::parse("a").unwrap();
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
    format!("https:{}", link)
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
