mod models;
mod modules;
use libc::{self, c_char};
use models::{DefaultModule, Module};
use modules::*;
use serde_json::{to_string, Value};
use std::{
    collections::HashMap,
    error::Error,
    ffi::{CStr, CString},
};
use tokio::runtime::Runtime;

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn get_module(domain: String) -> Box<dyn Module> {
    match domain.as_str() {
        "hentaifox.com" => Box::new(hentaifox::Hentaifox::new()),
        "imhentai.xxx" => Box::new(imhentai::Imhentai::new()),
        "luscious.net" => Box::new(luscious::Luscious::new()),
        "mangapark.to" => Box::new(mangapark::Mangapark::new()),
        "manhuascan.us" => Box::new(manhuascan::Manhuascan::new()),
        "manytoon.com" => Box::new(manytoon::Manytoon::new()),
        "nhentai.net" => Box::new(nhentai_net::Nhentai::new()),
        "nhentai.xxx" => Box::new(nhentai_xxx::Nhentai::new()),
        "nyahentai.red" => Box::new(nyahentai::Nyahentai::new()),
        "simplyhentai.org" => Box::new(simplyhentai::Simplyhentai::new()),
        "readonepiece.com" => Box::new(readonepiece::Readonepiece::new()),
        "toonily.com" => Box::new(toonily_com::Toonily::new()),
        "truemanga.com" => Box::new(truemanga::Truemanga::new()),
        _ => Box::new(DefaultModule::new()),
    }
}

fn get_all_modules() -> Vec<Box<dyn Module>> {
    vec![
        Box::new(hentaifox::Hentaifox::new()),
        Box::new(imhentai::Imhentai::new()),
        Box::new(luscious::Luscious::new()),
        Box::new(mangapark::Mangapark::new()),
        Box::new(manhuascan::Manhuascan::new()),
        Box::new(manytoon::Manytoon::new()),
        Box::new(nhentai_net::Nhentai::new()),
        Box::new(nhentai_xxx::Nhentai::new()),
        Box::new(nyahentai::Nyahentai::new()),
        Box::new(simplyhentai::Simplyhentai::new()),
        Box::new(readonepiece::Readonepiece::new()),
        Box::new(toonily_com::Toonily::new()),
        Box::new(truemanga::Truemanga::new()),
    ]
}

#[no_mangle]
pub extern "C" fn get_version() -> *mut c_char {
    CString::new(VERSION).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn get_modules() -> *mut c_char {
    let modules: Vec<HashMap<String, Value>> = get_all_modules()
        .into_iter()
        .map(|module: Box<dyn Module>| {
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
        .collect();
    let json: String = to_string(&modules).unwrap();
    CString::new(json).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn get_module_sample(domain: *const c_char) -> *mut c_char {
    let domain: String = unsafe { CStr::from_ptr(domain).to_str().unwrap_or("").to_string() };
    let module: Box<dyn Module> = get_module(domain);
    let sample: HashMap<&str, &str> = module.get_module_sample();
    let json: String = to_string(&sample).unwrap();
    CString::new(json).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn get_info(domain: *const c_char, manga: *const c_char) -> *mut c_char {
    let domain: String = unsafe { CStr::from_ptr(domain).to_str().unwrap_or("").to_string() };
    let module: Box<dyn Module> = get_module(domain);
    let manga: String = unsafe { CStr::from_ptr(manga).to_str().unwrap_or("").to_string() };
    let result: Result<HashMap<String, Value>, Box<dyn Error>> = Runtime::new()
        .unwrap()
        .block_on(async { module.get_info(manga).await });
    match result {
        Ok(info) => {
            let json: String = to_string(&info).unwrap();
            CString::new(json).unwrap_or_default().into_raw()
        }
        Err(_) => CString::new("").unwrap().into_raw(),
    }
}

#[no_mangle]
pub extern "C" fn get_chapters(domain: *const c_char, manga: *const c_char) -> *mut c_char {
    let domain: String = unsafe { CStr::from_ptr(domain).to_str().unwrap_or("").to_string() };
    let module: Box<dyn Module> = get_module(domain);
    let manga: String = unsafe { CStr::from_ptr(manga).to_str().unwrap_or("").to_string() };
    let result: Result<Vec<HashMap<String, String>>, Box<dyn Error>> = Runtime::new()
        .unwrap()
        .block_on(async { module.get_chapters(manga).await });
    match result {
        Ok(chapters) => {
            let json: String = to_string(&chapters).unwrap();
            CString::new(json).unwrap_or_default().into_raw()
        }
        Err(_) => CString::new("").unwrap().into_raw(),
    }
}

#[no_mangle]
pub extern "C" fn get_images(
    domain: *const c_char,
    manga: *const c_char,
    chapter: *const c_char,
) -> *mut c_char {
    let domain: String = unsafe { CStr::from_ptr(domain).to_str().unwrap_or("").to_string() };
    let module: Box<dyn Module> = get_module(domain);
    let manga: String = unsafe { CStr::from_ptr(manga).to_str().unwrap_or("").to_string() };
    let chapter: String = unsafe { CStr::from_ptr(chapter).to_str().unwrap_or("").to_string() };
    let result: Result<(Vec<String>, Value), Box<dyn Error>> = Runtime::new()
        .unwrap()
        .block_on(async { module.get_images(manga, chapter).await });
    match result {
        Ok(images) => {
            let json: String = to_string(&images).unwrap();
            CString::new(json).unwrap_or_default().into_raw()
        }
        Err(_) => CString::new("").unwrap().into_raw(),
    }
}

#[no_mangle]
pub extern "C" fn search_by_keyword(
    domain: *const c_char,
    keyword: *const c_char,
    absolute: bool,
    sleep_time: f64,
    page_limit: u32,
) -> *mut c_char {
    let domain: String = unsafe { CStr::from_ptr(domain).to_str().unwrap_or("").to_string() };
    let module: Box<dyn Module> = get_module(domain);
    let keyword: String = unsafe { CStr::from_ptr(keyword).to_str().unwrap_or("").to_string() };
    let result: Result<Vec<HashMap<String, String>>, Box<dyn Error>> =
        Runtime::new().unwrap().block_on(async {
            module
                .search_by_keyword(keyword, absolute, sleep_time, page_limit)
                .await
        });
    match result {
        Ok(search_results) => {
            let json: String = to_string(&search_results).unwrap();
            CString::new(json.to_string()).unwrap_or_default().into_raw()
        }
        Err(_) => CString::new("").unwrap().into_raw(),
    }
}

#[no_mangle]
pub extern "C" fn download_image(
    domain: *const c_char,
    url: *const c_char,
    image_name: *const c_char,
) -> *mut c_char {
    let domain: String = unsafe { CStr::from_ptr(domain).to_str().unwrap_or("").to_string() };
    let module: Box<dyn Module> = get_module(domain);
    let url: String = unsafe { CStr::from_ptr(url).to_str().unwrap_or("").to_string() };
    let image_name: String = unsafe {
        CStr::from_ptr(image_name)
            .to_str()
            .unwrap_or("")
            .to_string()
    };
    let result: Result<Option<String>, Box<dyn Error>> = Runtime::new()
        .unwrap()
        .block_on(async { module.download_image(url, image_name).await });
    match result {
        Ok(path) => CString::new(path.unwrap_or_default()).unwrap_or_default().into_raw(),
        Err(_) => CString::new("").unwrap().into_raw(),
    }
}

#[no_mangle]
pub extern "C" fn retrieve_image(domain: *const c_char, url: *const c_char) -> *mut c_char {
    let domain: String = unsafe { CStr::from_ptr(domain).to_str().unwrap_or("").to_string() };
    let module: Box<dyn Module> = get_module(domain);
    let url: String = unsafe { CStr::from_ptr(url).to_str().unwrap_or("").to_string() };
    let result: Result<String, Box<dyn Error>> = Runtime::new()
        .unwrap()
        .block_on(async { module.retrieve_image(url).await });
    match result {
        Ok(image) => CString::new(image).unwrap_or_default().into_raw(),
        Err(_) => CString::new("").unwrap().into_raw(),
    }
}

#[no_mangle]
pub extern "C" fn free_string(s: *mut c_char) {
    unsafe {
        if !s.is_null() {
            let _ = CString::from_raw(s);
        }
    }
}
