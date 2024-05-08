use crate::{
    image_merger,
    manhuascan::Manhuascan,
    models::{Manga, Module},
    pdf_converter,
};
use base64::{engine::general_purpose, Engine};
use image::{open, DynamicImage};
use rayon::prelude::*;
use serde_json::{to_value, Value};
use std::collections::HashMap;
use std::{
    fs::{read_dir, DirEntry},
    io::Error,
    path::PathBuf,
};

pub fn detect_images(path_to_source: String) -> Vec<(DynamicImage, PathBuf)> {
    let dirs: Vec<_> = read_dir(path_to_source).unwrap().collect();
    let images: Vec<(DynamicImage, PathBuf)> = dirs
        .par_iter()
        .filter_map(|dir: &Result<DirEntry, Error>| {
            let path: PathBuf = dir.as_ref().unwrap().path();
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
        .collect();
    images
}

pub fn validate_image(path: &str) -> bool {
    match open(path) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[tauri::command]
pub async fn retrieve_image(domain: String, url: String) -> String {
    match domain.trim() {
        "manhuascan.us" => {
            let response = Manhuascan::new()
                .send_request(&url, "GET", None, Some(true))
                .await
                .unwrap();
            let image = response.bytes().await.unwrap();
            let encoded_image = general_purpose::STANDARD.encode(image);
            return format!("data:image/png;base64, {}", encoded_image);
        }
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_info(domain: &str, url: &str) -> HashMap<&'static str, Value> {
    match domain {
        "manhuascan.us" => Manhuascan::new().get_info(url),
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_chapters(domain: &str, url: &str) -> Vec<HashMap<&'static str, String>> {
    match domain {
        "manhuascan.us" => Manhuascan::new().get_chapters(url),
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_modules() -> Vec<HashMap<&'static str, Value>> {
    let m_manhuascan: Manhuascan = Manhuascan::new();
    vec![HashMap::from([
        ("type", to_value("Manga").unwrap()),
        ("domain", to_value(m_manhuascan.domain).unwrap()),
        ("logo", to_value(m_manhuascan.logo).unwrap()),
        ("searchable", to_value(m_manhuascan.searchable).unwrap()),
        ("is_coded", Value::Bool(false)),
    ])]
}

#[tauri::command]
pub async fn merge(path_to_source: String, path_to_destination: String, merge_method: String) {
    image_merger::merge_folder(
        path_to_source,
        path_to_destination,
        if merge_method == "fit" { true } else { false },
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
    search_by_keyword(&module, &keyword, absolute, sleep_time, depth).await
}

pub async fn get_images(domain: &str, manga: &str, chapter: &str) -> (Vec<String>, Value) {
    match domain {
        "manhuascan.us" => Manhuascan::new().get_images(manga, &chapter).await,
        _ => Default::default(),
    }
}

pub async fn download_image(domain: &str, url: &str, image_name: &str) -> Option<String> {
    match domain {
        "manhuascan.us" => {
            let module: Manhuascan = Manhuascan::new();
            Manhuascan::new()
                .download_image(url, image_name, module.download_images_headers, Some(true))
                .await
        }
        _ => Default::default(),
    }
}

pub async fn search_by_keyword(
    domain: &str,
    keyword: &str,
    absolute: bool,
    sleep_time: f64,
    page_limit: u32,
) -> Vec<HashMap<String, String>> {
    match domain {
        "manhuascan.us" => {
            Manhuascan::new()
                .search_by_keyword(keyword, absolute, sleep_time, page_limit)
                .await
        }
        _ => Default::default(),
    }
}
