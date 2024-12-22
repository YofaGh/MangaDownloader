use lazy_static::lazy_static;
use libloading::{Library, Symbol};
use serde_json::Value;
use std::{
    collections::HashMap,
    error::Error,
    path::PathBuf,
    sync::{Mutex, MutexGuard},
};

lazy_static! {
    static ref LIB: Mutex<Option<Library>> = Mutex::new(None);
}

type GetVersionFn = fn() -> String;
type GetModulesFn = fn() -> Vec<HashMap<String, Value>>;
type GetModuleSampleFn = fn(String) -> HashMap<String, String>;
type GetInfoFn = fn(String, String) -> Result<HashMap<String, Value>, Box<dyn Error>>;
type GetChaptersFn = fn(String, String) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>>;
type RetrieveImageFn = fn(String, String) -> Result<String, Box<dyn Error>>;
type GetImagesFn = fn(String, String, String) -> Result<(Vec<String>, Value), Box<dyn Error>>;
type DownloadImageFn = fn(String, String, String) -> Result<Option<String>, Box<dyn Error>>;
type SearchByKeywordFn =
    fn(String, String, bool, f64, u32) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>>;

pub fn load_modules(modules_path: &PathBuf) -> Result<(), Box<dyn Error>> {
    let mut guard: MutexGuard<'_, Option<Library>> = LIB.lock()?;
    let lib: Library = unsafe { Library::new(modules_path) }?;
    *guard = Some(lib);
    Ok(())
}

pub fn unload_modules() -> Result<(), Box<dyn Error>> {
    let mut guard: MutexGuard<'_, Option<Library>> = LIB.lock()?;
    guard.take().ok_or("Library not loaded")?.close()?;
    Ok(())
}

fn with_symbol<T, F, R>(name: &str, f: F) -> Result<R, Box<dyn Error>>
where
    F: FnOnce(Symbol<T>) -> R,
{
    let guard: MutexGuard<'_, Option<Library>> = LIB.lock()?;
    let lib: &Library = guard.as_ref().ok_or("Library not loaded")?;
    let symbol: Symbol<T> = unsafe { lib.get(name.as_bytes())? };
    Ok(f(symbol))
}

pub fn get_modules_version() -> String {
    with_symbol("get_version", |f: Symbol<'_, GetVersionFn>| f()).unwrap()
}

pub async fn get_modules() -> Vec<HashMap<String, Value>> {
    with_symbol("get_modules", |f: Symbol<'_, GetModulesFn>| f()).unwrap()
}

pub async fn get_info(
    domain: String,
    url: String,
) -> Result<HashMap<String, Value>, Box<dyn Error>> {
    with_symbol("get_info", |f: Symbol<'_, GetInfoFn>| f(domain, url))?
}

pub async fn get_chapters(
    domain: String,
    url: String,
) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    with_symbol("get_chapters", |f: Symbol<'_, GetChaptersFn>| {
        f(domain, url)
    })?
}

pub async fn get_images(
    domain: String,
    manga: String,
    chapter: String,
) -> Result<(Vec<String>, Value), Box<dyn Error>> {
    with_symbol("get_images", |f: Symbol<'_, GetImagesFn>| {
        f(domain, manga, chapter)
    })?
}

pub async fn download_image(
    domain: String,
    url: String,
    image_name: String,
) -> Result<Option<String>, Box<dyn Error>> {
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
) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    with_symbol("search_by_keyword", |f: Symbol<'_, SearchByKeywordFn>| {
        f(domain, keyword, absolute, sleep_time, page_limit)
    })?
}

pub async fn retrieve_image(domain: String, url: String) -> Result<String, Box<dyn Error>> {
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
