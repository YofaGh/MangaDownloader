mod models;
mod modules;
use models::{DefaultModule, Module};
use modules::*;
use serde_json::Value;
use std::{collections::HashMap, error::Error};
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
pub fn get_version() -> String {
    VERSION.to_string()
}

#[no_mangle]
pub fn get_modules() -> Vec<HashMap<String, Value>> {
    get_all_modules()
        .into_iter()
        .map(|module: Box<dyn Module>| {
            HashMap::from([
                ("type".to_string(), Value::from(module.get_type())),
                ("domain".to_string(), Value::from(module.get_domain())),
                ("logo".to_string(), Value::from(module.get_logo())),
                (
                    "searchable".to_string(),
                    Value::Bool(module.is_searchable()),
                ),
                ("is_coded".to_string(), Value::Bool(module.is_coded())),
            ])
        })
        .collect()
}

#[no_mangle]
pub fn get_module_sample(domain: String) -> HashMap<String, String> {
    get_module(domain).get_module_sample()
}

#[no_mangle]
pub fn get_info(domain: String, manga: String) -> Result<HashMap<String, Value>, Box<dyn Error>> {
    Runtime::new()?.block_on(get_module(domain).get_info(manga))
}

#[no_mangle]
pub fn get_chapters(
    domain: String,
    manga: String,
) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    Runtime::new()?.block_on(get_module(domain).get_chapters(manga))
}

#[no_mangle]
pub fn get_images(
    domain: String,
    manga: String,
    chapter: String,
) -> Result<(Vec<String>, Value), Box<dyn Error>> {
    Runtime::new()?.block_on(get_module(domain).get_images(manga, chapter))
}

#[no_mangle]
pub fn search_by_keyword(
    domain: String,
    keyword: String,
    absolute: bool,
    sleep_time: f64,
    page_limit: u32,
) -> Result<Vec<HashMap<String, String>>, Box<dyn Error>> {
    Runtime::new()?
        .block_on(get_module(domain).search_by_keyword(keyword, absolute, sleep_time, page_limit))
}

#[no_mangle]
pub fn download_image(
    domain: String,
    url: String,
    image_name: String,
) -> Result<Option<String>, Box<dyn Error>> {
    Runtime::new()?.block_on(get_module(domain).download_image(url, image_name))
}

#[no_mangle]
pub fn retrieve_image(domain: String, url: String) -> Result<String, Box<dyn Error>> {
    Runtime::new()?.block_on(get_module(domain).retrieve_image(url))
}
