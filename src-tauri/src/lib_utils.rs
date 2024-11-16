use libloading::{Error as LibError, Library, Symbol};
use serde_json::{from_str, Value};
use std::{collections::HashMap, error::Error as StdError, path::PathBuf};

static mut LIB: Option<Library> = None;

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
    unsafe { LIB = Some(Library::new(modules_path)?) };
    Ok(())
}

pub fn unload_modules() -> Result<(), Box<dyn StdError>> {
    unsafe { LIB.take().unwrap().close()? };
    Ok(())
}

fn get_symbol<T>(name: &[u8]) -> Result<Symbol<T>, String> {
    unsafe {
        LIB.as_ref()
            .unwrap()
            .get(name)
            .map_err(|e: LibError| e.to_string())
    }
}

pub fn get_modules_version() -> Result<String, Box<dyn StdError>> {
    let version: String = unsafe { get_symbol::<GetVersionFn>(b"get_version")?() };
    Ok(version)
}

pub async fn get_modules() -> Result<Vec<HashMap<String, Value>>, Box<dyn StdError>> {
    let modules_json: String = unsafe { get_symbol::<GetModulesFn>(b"get_modules")?() };
    let modules: Vec<HashMap<String, Value>> = from_str(&modules_json)?;
    Ok(modules)
}

pub async fn get_info(
    domain: String,
    url: String,
) -> Result<HashMap<String, Value>, Box<dyn StdError>> {
    let info_json: String = unsafe { get_symbol::<GetInfoFn>(b"get_info")?(domain, url) };
    let info: HashMap<String, Value> = from_str(&info_json)?;
    Ok(info)
}

pub async fn get_chapters(
    domain: String,
    url: String,
) -> Result<Vec<HashMap<String, String>>, Box<dyn StdError>> {
    let chapters_json: String =
        unsafe { get_symbol::<GetChaptersFn>(b"get_chapters")?(domain, url) };
    let chapters: Vec<HashMap<String, String>> = from_str(&chapters_json)?;
    Ok(chapters)
}

pub async fn get_images(
    domain: String,
    manga: String,
    chapter: String,
) -> Result<(Vec<String>, Value), Box<dyn StdError>> {
    let images_json: String =
        unsafe { get_symbol::<GetImagesFn>(b"get_images")?(domain, manga, chapter) };
    let images: (Vec<String>, Value) = from_str(&images_json)?;
    Ok(images)
}

pub async fn download_image(
    domain: String,
    url: String,
    image_name: String,
) -> Result<Option<String>, Box<dyn StdError>> {
    let image: String =
        unsafe { get_symbol::<DownloadImageFn>(b"download_image")?(domain, url, image_name) };
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
    let results_json: String = unsafe {
        get_symbol::<SearchByKeywordFn>(b"search_by_keyword")?(
            domain, keyword, absolute, sleep_time, page_limit,
        )
    };
    let results: Vec<HashMap<String, String>> = from_str(&results_json)?;
    Ok(results)
}

pub async fn retrieve_image(domain: String, url: String) -> Result<String, Box<dyn StdError>> {
    let image: String = unsafe { get_symbol::<RetrieveImageFn>(b"retrieve_image")?(domain, url) };
    Ok(image)
}

pub async fn get_module_sample(
    domain: String,
) -> Result<HashMap<String, String>, Box<dyn StdError>> {
    let sample_json: String =
        unsafe { get_symbol::<GetModuleSampleFn>(b"get_module_sample")?(domain) };
    let sample: HashMap<String, String> = from_str(&sample_json)?;
    Ok(sample)
}
