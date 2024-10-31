use crate::{
    assets::check_and_update_dll,
    image_merger::merge_folder,
    lib_utils,
    pdf_converter::convert_folder,
    saucer::{iqdb, saucenao, tineye, upload, yandex},
};
use image::open;
use serde_json::Value;
use std::{collections::HashMap, io::Error, path::PathBuf, process::Command};
use tauri::{command, path::BaseDirectory::Resource, AppHandle, Manager, WebviewWindow};
use tokio::fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, ReadDir};

#[command(async)]
pub async fn get_data_dir_path(app: AppHandle) -> String {
    app.path()
        .app_data_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

#[command(async)]
pub async fn update_checker(app: AppHandle) {
    let mut path: String = format!("resources/modules");
    if cfg!(target_family = "windows") {
        path += ".dll";
    } else {
        path += ".so";
    }
    let modules_path: PathBuf = app.path().resolve(&path, Resource).unwrap();
    lib_utils::load_modules(modules_path.clone()).unwrap();
    let window: WebviewWindow = app.get_webview_window("splashscreen").unwrap();
    check_and_update_dll(window, modules_path).await;
    app.get_webview_window("splashscreen")
        .unwrap()
        .close()
        .unwrap();
    app.get_webview_window("main").unwrap().show().unwrap();
}

#[command(async)]
pub async fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .ok();
}

#[command(async)]
pub async fn remove_directory(path: String, recursive: bool) -> Result<(), String> {
    if !PathBuf::from(&path).exists() {
        return Ok(());
    }
    if recursive {
        remove_dir_all(&path)
            .await
            .map_err(|e: Error| e.to_string())
    } else {
        let mut entries: ReadDir = read_dir(&path).await.map_err(|e: Error| e.to_string())?;
        if let Ok(None) = entries.next_entry().await {
            remove_dir(&path).await.map_err(|e: Error| e.to_string())
        } else {
            Ok(())
        }
    }
}

#[command(async)]
pub async fn create_directory(path: String) -> Result<(), String> {
    create_dir_all(&path)
        .await
        .map_err(|e: Error| e.to_string())
}

#[command(async)]
pub async fn read_directory(path: String) -> Result<Vec<String>, String> {
    let mut entries: ReadDir = read_dir(&path).await.map_err(|e: Error| e.to_string())?;
    let mut paths: Vec<String> = Vec::new();
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|e: Error| e.to_string())?
    {
        if let Some(path_str) = entry.path().to_str() {
            paths.push(path_str.to_string());
        }
    }
    Ok(paths)
}

#[command(async)]
pub fn merge(path_to_source: &str, path_to_destination: &str, merge_method: &str) -> String {
    match merge_folder(path_to_source, path_to_destination, merge_method) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[command(async)]
pub fn convert(path: &str, pdf_name: &str) -> String {
    match convert_folder(path, pdf_name) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[command(async)]
pub fn validate_image(path: String) -> bool {
    match open(path) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[command(async)]
pub async fn get_modules() -> Vec<HashMap<String, Value>> {
    lib_utils::get_modules().await.unwrap_or_default()
}

#[command(async)]
pub async fn get_info(domain: String, url: String) -> HashMap<String, Value> {
    lib_utils::get_info(domain, url).await.unwrap_or_default()
}

#[command(async)]
pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    lib_utils::get_chapters(domain, url)
        .await
        .unwrap_or_default()
}

#[command(async)]
pub async fn get_images(domain: String, manga: String, chapter: String) -> (Vec<String>, Value) {
    lib_utils::get_images(domain, manga, chapter)
        .await
        .unwrap_or_default()
}

#[command(async)]
pub async fn download_image(domain: String, url: String, image_name: String) -> Option<String> {
    lib_utils::download_image(domain, url, image_name)
        .await
        .unwrap_or_default()
}

#[command(async)]
pub async fn search_by_keyword(
    domain: String,
    keyword: String,
    sleep_time: f64,
    page_limit: u32,
    absolute: bool,
) -> Vec<HashMap<String, String>> {
    lib_utils::search_by_keyword(domain, keyword, sleep_time, page_limit, absolute)
        .await
        .unwrap_or_default()
}

#[command(async)]
pub async fn retrieve_image(domain: String, url: String) -> String {
    lib_utils::retrieve_image(domain, url)
        .await
        .unwrap_or_default()
}

#[command(async)]
pub async fn get_module_sample(domain: String) -> HashMap<String, String> {
    lib_utils::get_module_sample(domain)
        .await
        .unwrap_or_default()
}

#[command(async)]
pub async fn sauce(saucer: String, url: String) -> Vec<HashMap<String, String>> {
    match saucer.as_str() {
        "yandex" => yandex(url).await.unwrap_or_default(),
        "tineye" => tineye(url).await.unwrap_or_default(),
        "iqdb" => iqdb(url).await.unwrap_or_default(),
        "saucenao" => saucenao(url).await.unwrap_or_default(),
        _ => Vec::new(),
    }
}

#[command(async)]
pub async fn upload_image(path: String) -> String {
    upload(path).await.unwrap_or_default()
}

#[command(async)]
pub async fn get_saucers_list() -> Vec<String> {
    vec![
        "yandex".to_string(),
        "tineye".to_string(),
        "iqdb".to_string(),
        "saucenao".to_string(),
    ]
}
