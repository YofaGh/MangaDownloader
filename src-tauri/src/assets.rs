use crate::{image_merger, models::Module, modules::*, pdf_converter};
use base64::{engine::general_purpose, Engine};
use image::{open, DynamicImage};
use rayon::prelude::*;
use reqwest::Response;
use serde_json::{from_str, to_value, Value};
use std::collections::HashMap;
use std::io::{Read, Seek, Write};
use std::process::Command;
use std::{
    fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, DirEntry, File, OpenOptions},
    io::Error,
    path::{Path, PathBuf},
};
use tokio_util::bytes::Bytes;

#[derive(Clone, serde::Serialize)]
struct DefaultSettings {
    auto_merge: bool,
    auto_convert: bool,
    load_covers: bool,
    sleep_time: f32,
    default_search_depth: i32,
    merge_method: String,
    download_path: Option<String>,
    data_dir_path: String,
}

impl DefaultSettings {
    fn new(data_dir: String) -> DefaultSettings {
        DefaultSettings {
            auto_merge: false,
            auto_convert: false,
            load_covers: true,
            sleep_time: 0.1,
            default_search_depth: 3,
            merge_method: String::from("Normal"),
            download_path: None,
            data_dir_path: data_dir,
        }
    }
}

pub fn load_up_checks(data_dir: String) {
    create_dir_all(&data_dir).ok();
    let default_settings: DefaultSettings = DefaultSettings::new(data_dir.clone());
    let file_array: [&str; 4] = [
        "library.json",
        "downloaded.json",
        "queue.json",
        "favorites.json",
    ];
    save_file(
        format!("{}/settings.json", data_dir),
        to_value(&default_settings).unwrap(),
    );
    for file in file_array {
        save_file(format!("{}/{}", data_dir, file), from_str("[]").unwrap());
    }
}

fn save_file(path: String, data: Value) {
    if !Path::new(&path).exists() {
        write_file(path, serde_json::to_string_pretty(&data).unwrap());
    }
}

#[tauri::command]
pub fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .ok();
}

#[tauri::command]
pub fn write_file(path: String, data: String) {
    let mut f: File = OpenOptions::new()
        .write(true)
        .read(true)
        .create(true)
        .open(&path)
        .unwrap();
    let _ = f.set_len(0);
    write!(f, "{}", &data).unwrap();
    f.rewind().ok();
}

#[tauri::command]
pub fn read_file(path: String) -> String {
    let mut f: File = OpenOptions::new()
        .write(true)
        .read(true)
        .open(&path)
        .unwrap();
    let mut buf: String = String::new();
    f.read_to_string(&mut buf).unwrap();
    buf
}

#[tauri::command]
pub fn remove_directory(path: String, recursive: bool) {
    if recursive {
        remove_dir_all(path).ok();
    } else if let Ok(entries) = read_dir(&path) {
        if entries.count() == 0 {
            remove_dir(path).ok();
        }
    }
}

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
        "readonepiece.com" => {
            response = get_readonepiece()
                .send_request(
                    &url,
                    "GET",
                    get_readonepiece().download_images_headers,
                    Some(true),
                )
                .await
                .unwrap();
        }
        "hentaifox.com" => {
            response = get_hentaifox()
                .send_request(
                    &url,
                    "GET",
                    get_readonepiece().download_images_headers,
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
        "readonepiece.com" => get_readonepiece().get_info(&url).await,
        "hentaifox.com" => get_hentaifox().get_info(&url).await,
        _ => Default::default(),
    }
}

#[tauri::command]
pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    match domain.trim() {
        "manhuascan.us" => get_manhuascan().get_chapters(&url).await,
        "toonily.com" => get_toonily_com().get_chapters(&url).await,
        "readonepiece.com" => get_readonepiece().get_chapters(&url).await,
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_module_type(domain: String) -> String {
    match domain.trim() {
        "manhuascan.us" => "Manga".to_string(),
        "toonily.com" => "Manga".to_string(),
        "readonepiece.com" => "Manga".to_string(),
        "hentaifox.com" => "Doujin".to_string(),
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_module_sample(domain: &str) -> HashMap<&str, &str> {
    match domain.trim() {
        "manhuascan.us" => HashMap::from([("manga", "secret-class")]),
        "toonily.com" => HashMap::from([("manga", "peerless-dad")]),
        "readonepiece.com" => HashMap::from([("manga", "one-piece-digital-colored-comics")]),
        "hentaifox.com" => HashMap::from([("code", "1")]),
        _ => Default::default(),
    }
}

#[tauri::command]
pub fn get_modules() -> Vec<HashMap<String, Value>> {
    let m_manhuascan = get_manhuascan();
    let m_toonily = get_toonily_com();
    let m_readonepiece = get_readonepiece();
    let m_hentaifox = get_hentaifox();
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
        HashMap::from([
            ("type".to_string(), to_value("Manga").unwrap()),
            ("domain".to_string(), to_value(m_readonepiece.domain).unwrap()),
            ("logo".to_string(), to_value(m_readonepiece.logo).unwrap()),
            (
                "searchable".to_string(),
                to_value(m_readonepiece.searchable).unwrap(),
            ),
            ("is_coded".to_string(), Value::Bool(false)),
        ]),
        HashMap::from([
            ("type".to_string(), to_value("Doujin").unwrap()),
            ("domain".to_string(), to_value(m_hentaifox.domain).unwrap()),
            ("logo".to_string(), to_value(m_hentaifox.logo).unwrap()),
            (
                "searchable".to_string(),
                to_value(m_hentaifox.searchable).unwrap(),
            ),
            ("is_coded".to_string(), Value::Bool(false)),
        ]),
    ]
}

#[tauri::command]
pub async fn get_images(domain: String, manga: String, chapter: String) -> (Vec<String>, Value) {
    match domain.trim() {
        "manhuascan.us" => get_manhuascan().get_images(&manga, &chapter).await,
        "toonily.com" => get_toonily_com().get_images(&manga, &chapter).await,
        "readonepiece.com" => get_readonepiece().get_images(&manga, &chapter).await,
        "hentaifox.com" => get_hentaifox().get_images(&manga, &chapter).await,
        _ => Default::default(),
    }
}

#[tauri::command]
pub async fn download_image(domain: String, url: String, image_name: String) -> Option<String> {
    match domain.trim() {
        "manhuascan.us" => {
            get_manhuascan()
                .download_image(
                    &url,
                    &image_name,
                    get_manhuascan().download_images_headers,
                    Some(true),
                )
                .await
        }
        "toonily.com" => {
            get_toonily_com()
                .download_image(
                    &url,
                    &image_name,
                    get_toonily_com().download_images_headers,
                    Some(true),
                )
                .await
        }
        "readonepiece.com" => {
            get_readonepiece()
                .download_image(
                    &url,
                    &image_name,
                    get_readonepiece().download_images_headers,
                    Some(true),
                )
                .await
        }
        "hentaifox.com" => {
            get_hentaifox()
                .download_image(
                    &url,
                    &image_name,
                    get_hentaifox().download_images_headers,
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
        "hentaifox.com" => {
            get_hentaifox()
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

fn get_readonepiece() -> readonepiece::Readonepiece {
    readonepiece::Readonepiece::new()
}

fn get_hentaifox() -> hentaifox::Hentaifox {
    hentaifox::Hentaifox::new()
}