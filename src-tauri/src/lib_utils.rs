use lazy_static::lazy_static;
use libloading::{Error as LibError, Library, Symbol};
use serde_json::Value;
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Mutex, MutexGuard, PoisonError},
};

use crate::errors::AppError;

lazy_static! {
    static ref LIB: Mutex<Option<Library>> = Mutex::new(None);
}

type GetVersionFn = fn() -> String;
type GetModulesFn = fn() -> Vec<HashMap<String, Value>>;
type GetModuleSampleFn = fn(String) -> HashMap<String, String>;
type GetInfoFn = fn(String, String) -> Result<HashMap<String, Value>, AppError>;
type GetChaptersFn = fn(String, String) -> Result<Vec<HashMap<String, String>>, AppError>;
type RetrieveImageFn = fn(String, String) -> Result<String, AppError>;
type GetImagesFn = fn(String, String, String) -> Result<(Vec<String>, Value), AppError>;
type DownloadImageFn = fn(String, String, String) -> Result<Option<String>, AppError>;
type SearchByKeywordFn =
    fn(String, String, bool, f64, u32) -> Result<Vec<HashMap<String, String>>, AppError>;

pub fn load_modules(modules_path: &PathBuf) -> Result<(), AppError> {
    let mut guard: MutexGuard<'_, Option<Library>> =
        LIB.lock()
            .map_err(|err: PoisonError<MutexGuard<'_, Option<Library>>>| {
                AppError::lock_library(err.to_string())
            })?;
    let lib: Library = unsafe { Library::new(modules_path) }.map_err(|err: LibError| {
        AppError::library(format!("Failed to load modules: {}", err.to_string()))
    })?;
    *guard = Some(lib);
    Ok(())
}

pub fn unload_modules() -> Result<(), AppError> {
    let mut guard: MutexGuard<'_, Option<Library>> =
        LIB.lock()
            .map_err(|err: PoisonError<MutexGuard<'_, Option<Library>>>| {
                AppError::lock_library(err.to_string())
            })?;
    guard
        .take()
        .ok_or_else(|| AppError::library("Failed to take guard".to_string()))?
        .close()
        .map_err(|err: LibError| {
            AppError::library(format!("Failed to unload modules: {}", err.to_string()))
        })
}

fn with_symbol<T, F, R>(name: &str, f: F) -> Result<R, AppError>
where
    F: FnOnce(Symbol<T>) -> R,
{
    let guard: MutexGuard<'_, Option<Library>> =
        LIB.lock()
            .map_err(|err: PoisonError<MutexGuard<'_, Option<Library>>>| {
                AppError::lock_library(err.to_string())
            })?;
    let lib: &Library = guard
        .as_ref()
        .ok_or_else(|| AppError::library("Failed to take guard".to_string()))?;
    let symbol: Symbol<T> = unsafe {
        lib.get(name.as_bytes()).map_err(|err: LibError| {
            AppError::library(format!("Failed to get symbol: {}", err.to_string()))
        })?
    };
    Ok(f(symbol))
}

pub fn get_modules_version() -> String {
    with_symbol("get_version", |f: Symbol<'_, GetVersionFn>| f()).unwrap()
}

pub async fn get_modules() -> Vec<HashMap<String, Value>> {
    with_symbol("get_modules", |f: Symbol<'_, GetModulesFn>| f()).unwrap()
}

pub async fn get_info(domain: String, url: String) -> Result<HashMap<String, Value>, AppError> {
    with_symbol("get_info", |f: Symbol<'_, GetInfoFn>| f(domain, url))?
}

pub async fn get_chapters(
    domain: String,
    url: String,
) -> Result<Vec<HashMap<String, String>>, AppError> {
    with_symbol("get_chapters", |f: Symbol<'_, GetChaptersFn>| {
        f(domain, url)
    })?
}

pub async fn get_images(
    domain: String,
    manga: String,
    chapter: String,
) -> Result<(Vec<String>, Value), AppError> {
    with_symbol("get_images", |f: Symbol<'_, GetImagesFn>| {
        f(domain, manga, chapter)
    })?
}

pub async fn download_image(
    domain: String,
    url: String,
    image_name: String,
) -> Result<Option<String>, AppError> {
    with_symbol("download_image", |f: Symbol<'_, DownloadImageFn>| {
        f(domain, url, image_name)
    })?
}

pub async fn search_by_keyword(
    domain: String,
    keyword: String,
    sleep_time: f64,
    page_limit: u32,
    absolute: bool,
) -> Result<Vec<HashMap<String, String>>, AppError> {
    with_symbol("search_by_keyword", |f: Symbol<'_, SearchByKeywordFn>| {
        f(domain, keyword, absolute, sleep_time, page_limit)
    })?
}

pub async fn retrieve_image(domain: String, url: String) -> Result<String, AppError> {
    with_symbol("retrieve_image", |f: Symbol<'_, RetrieveImageFn>| {
        f(domain, url)
    })?
}

pub async fn get_module_sample(domain: String) -> HashMap<String, String> {
    with_symbol("get_module_sample", |f: Symbol<'_, GetModuleSampleFn>| {
        f(domain)
    })
    .unwrap()
}
