use crate::{image_merger, models::{Module, DefaultModule}, modules::*, pdf_converter};
use base64::{engine::general_purpose, Engine};
use image::{open, DynamicImage};
use rayon::prelude::*;
use reqwest::Response;
use serde_json::{to_string_pretty, to_value, Value};
use std::{
    collections::HashMap,
    error::Error as StdError,
    fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, DirEntry, File, OpenOptions},
    io::{Error as DirError, Seek, Write},
    path::{Path, PathBuf},
    process::Command,
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
    file_array.into_iter().enumerate().for_each(|(_, file)| {
        save_file(format!("{}/{}", data_dir, file), Value::Array(Vec::new()));
    })
}

fn save_file(path: String, data: Value) {
    if !Path::new(&path).exists() {
        let mut f: File = OpenOptions::new()
            .write(true)
            .read(true)
            .create(true)
            .open(&path)
            .unwrap();
        let _ = f.set_len(0);
        write!(f, "{}", &to_string_pretty(&data).unwrap()).unwrap();
        f.rewind().ok();
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
pub fn merge(path_to_source: String, path_to_destination: String, merge_method: String) -> String {
    match image_merger::merge_folder(path_to_source, path_to_destination, merge_method) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[tauri::command]
pub fn convert(path_to_source: String, path_to_destination: String, pdf_name: String) -> String {
    match pdf_converter::convert_folder(path_to_source, path_to_destination, pdf_name) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
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
    let mut dirs: Vec<Result<DirEntry, DirError>> = read_dir(path_to_source).unwrap().collect();
    dirs.sort_by(
        |p1: &Result<DirEntry, DirError>, p2: &Result<DirEntry, DirError>| {
            natord::compare(
                p1.as_ref().unwrap().path().to_str().unwrap(),
                p2.as_ref().unwrap().path().to_str().unwrap(),
            )
        },
    );
    dirs.into_par_iter()
        .filter_map(|dir: Result<DirEntry, DirError>| {
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
pub async fn get_info(domain: String, url: String) -> HashMap<String, Value> {
    get_module(domain).get_info(url).await.unwrap_or_default()
}

#[tauri::command]
pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    get_module(domain)
        .get_chapters(url)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_module_sample(domain: String) -> HashMap<&'static str, &'static str> {
    get_module(domain).get_module_sample()
}

#[tauri::command]
pub async fn get_images(domain: String, manga: String, chapter: String) -> (Vec<String>, Value) {
    get_module(domain)
        .get_images(manga, chapter)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn download_image(domain: String, url: String, image_name: String) -> Option<String> {
    get_module(domain)
        .download_image(url, image_name)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn retrieve_image(domain: String, url: String) -> String {
    retrieve(domain, url).await.unwrap_or_default()
}

async fn retrieve(domain: String, url: String) -> Result<String, Box<dyn StdError>> {
    let response: Response = get_module(domain).retrieve_image(url).await?;
    let image: Bytes = response.bytes().await.unwrap();
    let encoded_image: String = general_purpose::STANDARD.encode(image);
    Ok(format!("data:image/png;base64, {}", encoded_image))
}

pub async fn search_by_keyword(
    domain: String,
    keyword: String,
    absolute: bool,
    sleep_time: f64,
    page_limit: u32,
) -> Vec<HashMap<String, String>> {
    get_module(domain)
        .search_by_keyword(keyword, absolute, sleep_time, page_limit)
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub fn get_modules() -> Vec<HashMap<String, Value>> {
    get_all_modules()
        .into_iter()
        .enumerate()
        .map(|(_, module)| {
            HashMap::from([
                ("type".to_string(), Value::String(module.get_type())),
                ("domain".to_string(), Value::String(module.get_domain())),
                ("logo".to_string(), Value::String(module.get_logo())),
                (
                    "searchable".to_string(),
                    Value::Bool(module.is_searchable()),
                ),
                ("is_coded".to_string(), Value::Bool(module.is_coded())),
            ])
        })
        .collect()
}

fn get_module(domain: String) -> Box<dyn Module> {
    match domain.as_str() {
        "hentaifox.com" => Box::new(hentaifox::Hentaifox::new()),
        "luscious.net" => Box::new(luscious::Luscious::new()),
        "manhuascan.us" => Box::new(manhuascan::Manhuascan::new()),
        "nhentai.net" => Box::new(nhentai_net::Nhentai::new()),
        "readonepiece.com" => Box::new(readonepiece::Readonepiece::new()),
        "toonily.com" => Box::new(toonily_com::Toonily::new()),
        _ => Box::new(DefaultModule::new()),
    }
}

fn get_all_modules() -> Vec<Box<dyn Module>> {
    vec![
        Box::new(hentaifox::Hentaifox::new()),
        Box::new(luscious::Luscious::new()),
        Box::new(manhuascan::Manhuascan::new()),
        Box::new(nhentai_net::Nhentai::new()),
        Box::new(readonepiece::Readonepiece::new()),
        Box::new(toonily_com::Toonily::new()),
    ]
}
