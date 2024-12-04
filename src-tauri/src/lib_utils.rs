use lazy_static::lazy_static;
use libloading::{Error as LibError, Library, Symbol};
use serde_json::{from_str, Value};
use std::{
    collections::HashMap,
    error::Error as StdError,
    path::PathBuf,
    sync::{Mutex, MutexGuard, PoisonError},
};

lazy_static! {
    static ref LIB: Mutex<Option<Library>> = Mutex::new(None);
}

type GetVersionFn = unsafe fn() -> String;
type GetModulesFn = unsafe fn() -> String;
type GetModuleSampleFn = unsafe fn(String) -> String;
type GetInfoFn = unsafe fn(String, String) -> String;
type GetChaptersFn = unsafe fn(String, String) -> String;
type RetrieveImageFn = unsafe fn(String, String) -> String;
type GetImagesFn = unsafe fn(String, String, String) -> String;
type DownloadImageFn = unsafe fn(String, String, String) -> String;
type SearchByKeywordFn = unsafe fn(String, String, bool, f64, u32) -> String;

pub fn load_modules(modules_path: &PathBuf) -> Result<(), Box<dyn StdError>> {
    let lib: Library = unsafe { Library::new(modules_path) }?;
    let mut guard: MutexGuard<'_, Option<Library>> = LIB
        .lock()
        .map_err(|e: PoisonError<MutexGuard<'_, Option<Library>>>| e.to_string())?;
    *guard = Some(lib);
    Ok(())
}

pub fn unload_modules() -> Result<(), Box<dyn StdError>> {
    let mut guard: MutexGuard<'_, Option<Library>> = LIB
        .lock()
        .map_err(|e: PoisonError<MutexGuard<'_, Option<Library>>>| e.to_string())?;
    guard.take().ok_or("Library not loaded")?.close()?;
    Ok(())
}

fn with_symbol<T, F, R>(name: &[u8], f: F) -> Result<R, String>
where
    F: FnOnce(Symbol<T>) -> R,
{
    let guard: MutexGuard<'_, Option<Library>> = LIB
        .lock()
        .map_err(|e: PoisonError<MutexGuard<'_, Option<Library>>>| e.to_string())?;
    let lib: &Library = guard.as_ref().ok_or("Library not loaded")?;
    let symbol: Symbol<T> = unsafe { lib.get(name).map_err(|e: LibError| e.to_string())? };
    Ok(f(symbol))
}

pub fn get_modules_version() -> Result<String, Box<dyn StdError>> {
    let version: String = with_symbol::<GetVersionFn, _, _>(
        b"get_version",
        |f: Symbol<'_, unsafe fn() -> String>| unsafe { f() },
    )?;
    Ok(version)
}

pub async fn get_modules() -> Result<Vec<HashMap<String, Value>>, Box<dyn StdError>> {
    let modules_json: String = with_symbol::<GetModulesFn, _, _>(
        b"get_modules",
        |f: Symbol<'_, unsafe fn() -> String>| unsafe { f() },
    )?;
    let modules: Vec<HashMap<String, Value>> = from_str(&modules_json)?;
    Ok(modules)
}

pub async fn get_info(
    domain: String,
    url: String,
) -> Result<HashMap<String, Value>, Box<dyn StdError>> {
    let info_json: String = with_symbol::<GetInfoFn, _, _>(
        b"get_info",
        |f: Symbol<'_, unsafe fn(String, String) -> String>| unsafe { f(domain, url) },
    )?;
    let info: HashMap<String, Value> = from_str(&info_json)?;
    Ok(info)
}

pub async fn get_chapters(
    domain: String,
    url: String,
) -> Result<Vec<HashMap<String, String>>, Box<dyn StdError>> {
    let chapters_json: String = with_symbol::<GetChaptersFn, _, _>(
        b"get_chapters",
        |f: Symbol<'_, unsafe fn(String, String) -> String>| unsafe { f(domain, url) },
    )?;
    let chapters: Vec<HashMap<String, String>> = from_str(&chapters_json)?;
    Ok(chapters)
}

pub async fn get_images(
    domain: String,
    manga: String,
    chapter: String,
) -> Result<(Vec<String>, Value), Box<dyn StdError>> {
    let images_json: String = with_symbol::<GetImagesFn, _, _>(
        b"get_images",
        |f: Symbol<'_, unsafe fn(String, String, String) -> String>| unsafe {
            f(domain, manga, chapter)
        },
    )?;
    let images: (Vec<String>, Value) = from_str(&images_json)?;
    Ok(images)
}

pub async fn download_image(
    domain: String,
    url: String,
    image_name: String,
) -> Result<Option<String>, Box<dyn StdError>> {
    let image: String = with_symbol::<DownloadImageFn, _, _>(
        b"download_image",
        |f: Symbol<'_, unsafe fn(String, String, String) -> String>| unsafe {
            f(domain, url, image_name)
        },
    )?;
    if image.is_empty() {
        Ok(None)
    } else {
        Ok(Some(image))
    }
}

pub async fn search_by_keyword(
    domain: String,
    keyword: String,
    sleep_time: f64,
    page_limit: u32,
    absolute: bool,
) -> Result<Vec<HashMap<String, String>>, Box<dyn StdError>> {
    let results_json: String = with_symbol::<SearchByKeywordFn, _, _>(
        b"search_by_keyword",
        |f: Symbol<'_, unsafe fn(String, String, bool, f64, u32) -> String>| unsafe {
            f(domain, keyword, absolute, sleep_time, page_limit)
        },
    )?;
    let results: Vec<HashMap<String, String>> = from_str(&results_json)?;
    Ok(results)
}

pub async fn retrieve_image(domain: String, url: String) -> Result<String, Box<dyn StdError>> {
    let image: String = with_symbol::<RetrieveImageFn, _, _>(
        b"retrieve_image",
        |f: Symbol<'_, unsafe fn(String, String) -> String>| unsafe { f(domain, url) },
    )?;
    Ok(image)
}

pub async fn get_module_sample(
    domain: String,
) -> Result<HashMap<String, String>, Box<dyn StdError>> {
    let sample_json: String = with_symbol::<GetModuleSampleFn, _, _>(
        b"get_module_sample",
        |f: Symbol<'_, unsafe fn(String) -> String>| unsafe { f(domain) },
    )?;
    let sample: HashMap<String, String> = from_str(&sample_json)?;
    Ok(sample)
}
