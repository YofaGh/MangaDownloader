mod errors;
mod macros;
mod models;
mod modules;
mod types;
use errors::Error;
use modules::*;
use serde_json::Value;
use tokio::runtime::Runtime;
use types::*;

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn get_module(domain: String) -> Result<BoxModule> {
    match domain.as_str() {
        "hentaifox.com" => Ok(Box::new(hentaifox::Hentaifox::new())),
        "imhentai.xxx" => Ok(Box::new(imhentai::Imhentai::new())),
        "luscious.net" => Ok(Box::new(luscious::Luscious::new())),
        "mangapark.to" => Ok(Box::new(mangapark::Mangapark::new())),
        "manhuascan.us" => Ok(Box::new(manhuascan::Manhuascan::new())),
        "manytoon.com" => Ok(Box::new(manytoon::Manytoon::new())),
        "nhentai.net" => Ok(Box::new(nhentai_net::Nhentai::new())),
        "nhentai.xxx" => Ok(Box::new(nhentai_xxx::Nhentai::new())),
        "nyahentai.red" => Ok(Box::new(nyahentai::Nyahentai::new())),
        "simplyhentai.org" => Ok(Box::new(simplyhentai::Simplyhentai::new())),
        "readonepiece.com" => Ok(Box::new(readonepiece::Readonepiece::new())),
        "toonily.com" => Ok(Box::new(toonily_com::Toonily::new())),
        "truemanga.com" => Ok(Box::new(truemanga::Truemanga::new())),
        _ => Err(Error::Other(format!("Domain {} is not supported", domain))),
    }
}

fn get_all_modules() -> Vec<BoxModule> {
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
pub fn get_version() -> Result<String> {
    Ok(VERSION.to_owned())
}

#[no_mangle]
pub fn get_modules() -> Result<Vec<ValueHashMap>> {
    get_all_modules()
        .into_iter()
        .map(|module: BoxModule| module.get_module_info())
        .collect()
}

#[no_mangle]
pub fn get_module_sample(domain: String) -> Result<BasicHashMap> {
    Ok(get_module(domain)?.get_module_sample())
}

#[no_mangle]
pub fn get_info(domain: String, manga: String) -> Result<ValueHashMap> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.get_info(manga))
}

#[no_mangle]
pub fn get_webtoon_url(domain: String, manga: String) -> Result<String> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.get_webtoon_url(manga))
}

#[no_mangle]
pub fn get_chapter_url(domain: String, manga: String, chapter: String) -> Result<String> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.get_chapter_url(manga, chapter))
}

#[no_mangle]
pub fn get_chapters(domain: String, manga: String) -> Result<Vec<BasicHashMap>> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.get_chapters(manga))
}

#[no_mangle]
pub fn get_images(domain: String, manga: String, chapter: String) -> Result<(Vec<String>, Value)> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.get_images(manga, chapter))
}

#[no_mangle]
pub fn search_by_keyword(
    domain: String,
    keyword: String,
    absolute: bool,
    sleep_time: f64,
    page_limit: u32,
) -> Result<Vec<BasicHashMap>> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.search_by_keyword(keyword, absolute, sleep_time, page_limit))
}

#[no_mangle]
pub fn download_image(domain: String, url: String, image_name: String) -> Result<Option<String>> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.download_image(url, image_name))
}

#[no_mangle]
pub fn retrieve_image(domain: String, url: String) -> Result<String> {
    Runtime::new()
        .map_err(Error::runtime)?
        .block_on(get_module(domain)?.retrieve_image(url))
}
