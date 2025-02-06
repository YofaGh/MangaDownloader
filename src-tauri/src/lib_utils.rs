use lazy_static::lazy_static;
use libloading::{Error as LibError, Library, Symbol};
use serde_json::Value;
use std::{
    path::PathBuf,
    sync::{Mutex, MutexGuard, PoisonError},
};

use crate::{errors::Error, types::*};

lazy_static! {
    static ref LIB: Mutex<Option<Library>> = Mutex::new(None);
}

pub fn load_modules(modules_path: &PathBuf) -> Result<()> {
    let mut guard: MutexGuard<'_, Option<Library>> =
        LIB.lock()
            .map_err(|err: PoisonError<MutexGuard<'_, Option<Library>>>| {
                Error::lock_library(err.to_string())
            })?;
    let lib: Library = unsafe { Library::new(modules_path) }
        .map_err(|err: LibError| Error::library(format!("Failed to load modules: {}", err)))?;
    *guard = Some(lib);
    Ok(())
}

pub fn unload_modules() -> Result<()> {
    let mut guard: MutexGuard<'_, Option<Library>> =
        LIB.lock()
            .map_err(|err: PoisonError<MutexGuard<'_, Option<Library>>>| {
                Error::lock_library(err.to_string())
            })?;
    guard
        .take()
        .ok_or_else(|| Error::library("Failed to take guard".to_owned()))?
        .close()
        .map_err(|err: LibError| Error::library(format!("Failed to unload modules: {}", err)))
}

fn with_symbol<T, F, R>(name: &str, f: F) -> Result<R>
where
    F: FnOnce(Symbol<T>) -> R,
{
    let guard: MutexGuard<'_, Option<Library>> =
        LIB.lock()
            .map_err(|err: PoisonError<MutexGuard<'_, Option<Library>>>| {
                Error::lock_library(err.to_string())
            })?;
    let lib: &Library = guard
        .as_ref()
        .ok_or_else(|| Error::library("Failed to take guard".to_owned()))?;
    let symbol: Symbol<T> = unsafe {
        lib.get(name.as_bytes())
            .map_err(|err: LibError| Error::library(format!("Failed to get symbol: {}", err)))?
    };
    Ok(f(symbol))
}

pub fn get_modules_version() -> Result<String> {
    with_symbol("get_version", |f: Symbol<'_, GetVersionFn>| f())?
}

pub async fn get_modules() -> Result<Vec<ValueHashMap>> {
    with_symbol("get_modules", |f: Symbol<'_, GetModulesFn>| f())?
}

pub async fn get_webtoon_url(domain: String, url: String) -> Result<String> {
    with_symbol("get_webtoon_url", |f: Symbol<'_, GetWebtoonUrlFn>| {
        f(domain, url)
    })?
}

pub async fn get_chapter_url(domain: String, url: String, chapter: String) -> Result<String> {
    with_symbol("get_chapter_url", |f: Symbol<'_, GetChapterUrlFn>| {
        f(domain, url, chapter)
    })?
}

pub async fn get_info(domain: String, url: String) -> Result<ValueHashMap> {
    with_symbol("get_info", |f: Symbol<'_, GetInfoFn>| f(domain, url))?
}

pub async fn get_chapters(domain: String, url: String) -> Result<Vec<BasicHashMap>> {
    with_symbol("get_chapters", |f: Symbol<'_, GetChaptersFn>| {
        f(domain, url)
    })?
}

pub async fn get_images(
    domain: String,
    manga: String,
    chapter: String,
) -> Result<(Vec<String>, Value)> {
    with_symbol("get_images", |f: Symbol<'_, GetImagesFn>| {
        f(domain, manga, chapter)
    })?
}

pub async fn download_image(
    domain: String,
    url: String,
    image_name: String,
) -> Result<Option<String>> {
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
) -> Result<Vec<BasicHashMap>> {
    with_symbol("search_by_keyword", |f: Symbol<'_, SearchByKeywordFn>| {
        f(domain, keyword, absolute, sleep_time, page_limit)
    })?
}

pub async fn retrieve_image(domain: String, url: String) -> Result<String> {
    with_symbol("retrieve_image", |f: Symbol<'_, RetrieveImageFn>| {
        f(domain, url)
    })?
}

pub async fn get_module_sample(domain: String) -> Result<BasicHashMap> {
    with_symbol("get_module_sample", |f: Symbol<'_, GetModuleSampleFn>| {
        f(domain)
    })?
}
