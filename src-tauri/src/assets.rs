use crate::{image_merger, models::Module, modules::*, pdf_converter};
use base64::{engine::general_purpose, Engine};
use image::{open, DynamicImage};
use rayon::prelude::*;
use reqwest::Response;
use serde_json::{to_value, Value};
use std::collections::HashMap;
use std::{
    fs::{read_dir, DirEntry},
    io::Error,
    path::PathBuf,
};
use tokio_util::bytes::Bytes;

#[tauri::command]
pub async fn merge(path_to_source: String, path_to_destination: String, merge_method: String) {
    image_merger::merge_folder(
        path_to_source,
        path_to_destination,
        if merge_method == "Fit" { true } else { false },
    )
    .await;
}

#[tauri::command]
pub async fn convert(path_to_source: String, path_to_destination: String, pdf_name: String) {
    pdf_converter::convert_folder(path_to_source, path_to_destination, pdf_name).await;
}

#[tauri::command]
pub async fn search_keyword_one(
    module: String,
    keyword: String,
    sleep_time: f64,
    depth: u32,
    absolute: bool,
) -> Vec<HashMap<String, String>> {
    search_by_keyword(module, keyword, absolute, sleep_time, depth).await
}

pub fn detect_images(path_to_source: String) -> Vec<(DynamicImage, PathBuf)> {
    let mut dirs: Vec<Result<DirEntry, Error>> = read_dir(path_to_source).unwrap().collect();
    dirs.sort_by(
        |p1: &Result<DirEntry, Error>, p2: &Result<DirEntry, Error>| {
            natord::compare(
                p1.as_ref().unwrap().path().to_str().unwrap(),
                p2.as_ref().unwrap().path().to_str().unwrap(),
            )
        },
    );
    dirs.into_par_iter()
        .filter_map(|dir: Result<DirEntry, Error>| {
            let path: PathBuf = dir.unwrap().path();
            if matches!(
                path.extension().and_then(|ext| ext.to_str()),
                Some("jpg") | Some("png") | Some("jpeg") | Some("gif") | Some("webp")
            ) {
                match open(path.clone()) {
                    Ok(image) => Some((image, path)),
                    Err(_) => None,
                }
            } else {
                None
            }
        })
        .collect()
}

pub fn validate_image(path: &str) -> bool {
    match open(path) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[tauri::command]
pub async fn retrieve_image(domain: String, url: String) -> String {
    let response: Response;
    match domain.trim() {
        "manhuascan.us" => {
            response = get_manhuascan()
                .send_request(&url, "GET", None, Some(true))
                .await
                .unwrap();
        }
        "toonily.com" => {
            response = get_toonily_com()
                .send_request(
                    &url,
                    "GET",
                    get_toonily_com().download_images_headers,
                    Some(true),
                )
                .await
                .unwrap();
        }
        _ => return "".to_string(),
    }
    let image: Bytes = response.bytes().await.unwrap();
    let encoded_image: String = general_purpose::STANDARD.encode(image);
    format!("data:image/png;base64, {}", encoded_image)
}

#[tauri::command]
pub async fn get_info(domain: String, url: String) -> HashMap<String, Value> {
    match domain.trim() {
        "manhuascan.us" => get_manhuascan().get_info(&url).await,
        "toonily.com" => get_toonily_com().get_info(&url).await,
        _ => Default::default(),
    }
}

#[tauri::command]
pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    match domain.trim() {
        "manhuascan.us" => get_manhuascan().get_chapters(&url).await,
        "toonily.com" => get_toonily_com().get_chapters(&url).await,
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_module_type(domain: String) -> String {
    match domain.trim() {
        "manhuascan.us" => "Manga".to_string(),
        "toonily.com" => "Manga".to_string(),
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_modules() -> Vec<HashMap<String, Value>> {
    let m_manhuascan = get_manhuascan();
    let m_toonily = get_toonily_com();
    vec![
        HashMap::from([
            ("type".to_string(), to_value("Manga").unwrap()),
            ("domain".to_string(), to_value(m_manhuascan.domain).unwrap()),
            ("logo".to_string(), to_value(m_manhuascan.logo).unwrap()),
            (
                "searchable".to_string(),
                to_value(m_manhuascan.searchable).unwrap(),
            ),
            ("is_coded".to_string(), Value::Bool(false)),
        ]),
        HashMap::from([
            ("type".to_string(), to_value("Manga").unwrap()),
            ("domain".to_string(), to_value(m_toonily.domain).unwrap()),
            ("logo".to_string(), to_value(m_toonily.logo).unwrap()),
            (
                "searchable".to_string(),
                to_value(m_toonily.searchable).unwrap(),
            ),
            ("is_coded".to_string(), Value::Bool(false)),
        ]),
    ]
}

pub async fn get_images(domain: &str, manga: &str, chapter: &str) -> (Vec<String>, Value) {
    match domain {
        "manhuascan.us" => get_manhuascan().get_images(manga, &chapter).await,
        "toonily.com" => get_toonily_com().get_images(manga, &chapter).await,
        _ => Default::default(),
    }
}

pub async fn download_image(domain: &str, url: &str, image_name: &str) -> Option<String> {
    match domain {
        "manhuascan.us" => {
            get_manhuascan()
                .download_image(
                    url,
                    image_name,
                    get_manhuascan().download_images_headers,
                    Some(true),
                )
                .await
        }
        "toonily.com" => {
            get_toonily_com()
                .download_image(
                    url,
                    image_name,
                    get_toonily_com().download_images_headers,
                    Some(true),
                )
                .await
        }
        _ => Default::default(),
    }
}

pub async fn search_by_keyword(
    domain: String,
    keyword: String,
    absolute: bool,
    sleep_time: f64,
    page_limit: u32,
) -> Vec<HashMap<String, String>> {
    match domain.trim() {
        "manhuascan.us" => {
            get_manhuascan()
                .search_by_keyword(keyword, absolute, sleep_time, page_limit)
                .await
        }
        "toonily.com" => {
            get_toonily_com()
                .search_by_keyword(keyword, absolute, sleep_time, page_limit)
                .await
        }
        _ => Default::default(),
    }
}

fn get_manhuascan() -> manhuascan::Manhuascan {
    manhuascan::Manhuascan::new()
}

fn get_toonily_com() -> toonily_com::Toonily {
    toonily_com::Toonily::new()
}
