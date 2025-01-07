use image::open;
use serde_json::Value;
use std::{collections::HashMap, fs::DirEntry, path::PathBuf};
use tauri::{command, AppHandle, Error as TauriError, Manager};

use crate::{
    assets, errors::AppError, image_merger::merge_folder, lib_utils, pdf_converter::convert_folder,
    saucer,
};

#[command(async)]
pub async fn get_data_dir_path(app: AppHandle) -> Result<PathBuf, AppError> {
    app.path()
        .app_data_dir()
        .map_err(|err: TauriError| AppError::TauriError(err.to_string()))
}

#[command(async)]
pub async fn update_checker(app: AppHandle) -> Result<(), AppError> {
    assets::update_checker(app).await
}

#[command(async)]
pub async fn open_folder(path: String) -> Result<(), AppError> {
    assets::open_folder(path).await
}

#[command(async)]
pub async fn remove_directory(path: String, recursive: bool) -> Result<(), AppError> {
    assets::remove_directory(path, recursive)
}

#[command(async)]
pub async fn create_directory(path: String) -> Result<(), AppError> {
    assets::create_directory(&path)
}

#[command(async)]
pub async fn read_directory(path: String) -> Result<Vec<String>, AppError> {
    assets::read_directory(&path)?
        .into_iter()
        .filter_map(|entry: DirEntry| entry.path().to_str().map(|path: &str| Ok(path.to_owned())))
        .collect()
}

#[command(async)]
pub fn merge(
    path_to_source: &str,
    path_to_destination: &str,
    merge_method: &str,
) -> Result<(), AppError> {
    merge_folder(path_to_source, path_to_destination, merge_method)
}

#[command(async)]
pub fn convert(path: &str, pdf_name: &str) -> Result<(), AppError> {
    convert_folder(path, pdf_name)
}

#[command(async)]
pub fn validate_image(path: String) -> bool {
    open(path).is_ok()
}

#[command(async)]
pub async fn get_modules() -> Vec<HashMap<String, Value>> {
    lib_utils::get_modules()
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn get_info(domain: String, url: String) -> HashMap<String, Value> {
    lib_utils::get_info(domain, url)
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    lib_utils::get_chapters(domain, url)
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn get_images(domain: String, manga: String, chapter: String) -> (Vec<String>, Value) {
    lib_utils::get_images(domain, manga, chapter)
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn download_image(domain: String, url: String, image_name: String) -> Option<String> {
    lib_utils::download_image(domain, url, image_name)
        .await
        .map_err(|err: AppError| println!("{}", err))
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
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn retrieve_image(domain: String, url: String) -> String {
    lib_utils::retrieve_image(domain, url)
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn get_module_sample(domain: String) -> HashMap<String, String> {
    lib_utils::get_module_sample(domain)
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn sauce(saucer: String, url: String) -> Vec<HashMap<String, String>> {
    saucer::sauce(saucer, url)
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn upload_image(path: String) -> String {
    saucer::upload(path.as_str())
        .await
        .map_err(|err: AppError| println!("{}", err))
        .unwrap_or_default()
}

#[command(async)]
pub async fn get_saucers_list() -> Vec<String> {
    saucer::get_saucers_list()
}
