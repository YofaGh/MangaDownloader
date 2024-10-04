use crate::{
    assets::check_and_update_dll,
    image_merger::merge_folder,
    lib_utils,
    pdf_converter::convert_folder,
    saucer::{iqdb, saucenao, tineye, upload, yandex},
};
use image::open;
use serde_json::Value;
use std::{
    collections::HashMap,
    fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, DirEntry},
    io::Error,
    path::PathBuf,
    process::Command,
};
use tauri::{command, path::BaseDirectory::Resource, AppHandle, Emitter, Manager, WebviewWindow};

#[command]
pub async fn get_data_dir_path(app: AppHandle) -> String {
    app.path()
        .app_data_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

#[command]
pub async fn update_checker(app: AppHandle) {
    let modules_path: PathBuf = app
        .path()
        .resolve("resources/modules.dll", Resource)
        .unwrap();
    lib_utils::load_modules(modules_path.clone());
    let window: WebviewWindow = app.get_webview_window("splashscreen").unwrap();
    window.emit("updateStatus", "Checking for updates").unwrap();
    check_and_update_dll(window, modules_path).await;
    app.get_webview_window("splashscreen")
        .unwrap()
        .close()
        .unwrap();
    app.get_webview_window("main").unwrap().show().unwrap();
}

#[command]
pub fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .ok();
}

#[command]
pub fn remove_directory(path: String, recursive: bool) {
    if recursive {
        remove_dir_all(path).ok();
    } else if let Ok(entries) = read_dir(&path) {
        if entries.count() == 0 {
            remove_dir(path).ok();
        }
    }
}

#[command]
pub async fn create_directory(path: String) -> Result<(), String> {
    create_dir_all(&path).map_err(|e: Error| e.to_string())
}

#[command]
pub fn read_directory(path: String) -> Result<Vec<String>, String> {
    read_dir(&path)
        .map_err(|e: Error| e.to_string())?
        .map(|entry: Result<DirEntry, Error>| {
            entry.map(|e: DirEntry| e.path().to_str().unwrap().to_string())
        })
        .collect::<Result<Vec<String>, Error>>()
        .map_err(|e: Error| e.to_string())
}

#[command]
pub fn merge(path_to_source: String, path_to_destination: String, merge_method: String) -> String {
    match merge_folder(path_to_source, path_to_destination, merge_method) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[command]
pub fn convert(path: String, pdf_name: String) -> String {
    match convert_folder(path, pdf_name) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[command]
pub fn validate_image(path: String) -> bool {
    match open(path) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[command]
pub async fn get_modules() -> Vec<HashMap<String, Value>> {
    lib_utils::get_modules().await
}

#[command]
pub async fn get_info(domain: String, url: String) -> HashMap<String, Value> {
    lib_utils::get_info(domain, url).await
}

#[command]
pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    lib_utils::get_chapters(domain, url).await
}

#[command]
pub async fn get_images(domain: String, manga: String, chapter: String) -> (Vec<String>, Value) {
    lib_utils::get_images(domain, manga, chapter).await
}

#[command]
pub async fn download_image(domain: String, url: String, image_name: String) -> Option<String> {
    lib_utils::download_image(domain, url, image_name).await
}

#[command]
pub async fn search_by_keyword(
    domain: String,
    keyword: String,
    sleep_time: f64,
    page_limit: u32,
    absolute: bool,
) -> Vec<HashMap<String, String>> {
    lib_utils::search_by_keyword(domain, keyword, sleep_time, page_limit, absolute).await
}

#[command]
pub async fn retrieve_image(domain: String, url: String) -> String {
    lib_utils::retrieve_image(domain, url).await
}

#[command]
pub async fn get_module_sample(domain: String) -> HashMap<String, String> {
    lib_utils::get_module_sample(domain).await
}

#[command]
pub async fn sauce(saucer: String, url: String) -> Vec<HashMap<String, String>> {
    match saucer.as_str() {
        "yandex" => yandex(url.as_str()).await.unwrap_or_default(),
        "tineye" => tineye(url.as_str()).await.unwrap_or_default(),
        "iqdb" => iqdb(url.as_str()).await.unwrap_or_default(),
        "saucenao" => saucenao(url.as_str()).await.unwrap_or_default(),
        _ => Vec::new(),
    }
}

#[command]
pub async fn upload_image(path: String) -> String {
    upload(path.as_str()).await.unwrap_or_default()
}

#[command]
pub fn get_saucers_list() -> Vec<String> {
    vec![
        "yandex".to_string(),
        "tineye".to_string(),
        "iqdb".to_string(),
        "saucenao".to_string(),
    ]
}
