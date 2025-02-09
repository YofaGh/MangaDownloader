mod errors;
mod macros;
mod models;
mod module_contributer;
mod modules;
mod prelude;
mod types;
use module_contributer::*;
use prelude::*;

use tokio::runtime::Runtime;

const VERSION: &str = env!("CARGO_PKG_VERSION");

fn get_runtime() -> Result<Runtime> {
    Runtime::new().map_err(Error::runtime)
}

#[no_mangle]
pub fn get_version() -> Result<String> {
    Ok(VERSION.to_owned())
}

#[no_mangle]
pub fn get_modules() -> Result<Vec<ValueHashMap>> {
    get_all_modules()
        .into_iter()
        .map(|module: &BoxModule| module.get_module_info())
        .collect()
}

#[no_mangle]
pub fn get_module_sample(domain: String) -> Result<BasicHashMap> {
    Ok(get_module(domain)?.get_module_sample())
}

#[no_mangle]
pub fn get_info(domain: String, manga: String) -> Result<ValueHashMap> {
    get_runtime()?.block_on(get_module(domain)?.get_info(manga))
}

#[no_mangle]
pub fn get_webtoon_url(domain: String, manga: String) -> Result<String> {
    get_runtime()?.block_on(get_module(domain)?.get_webtoon_url(manga))
}

#[no_mangle]
pub fn get_chapter_url(domain: String, manga: String, chapter: String) -> Result<String> {
    get_runtime()?.block_on(get_module(domain)?.get_chapter_url(manga, chapter))
}

#[no_mangle]
pub fn get_chapters(domain: String, manga: String) -> Result<Vec<BasicHashMap>> {
    get_runtime()?.block_on(get_module(domain)?.get_chapters(manga))
}

#[no_mangle]
pub fn get_images(domain: String, manga: String, chapter: String) -> Result<(Vec<String>, Value)> {
    get_runtime()?.block_on(get_module(domain)?.get_images(manga, chapter))
}

#[no_mangle]
pub fn search_by_keyword(
    domain: String,
    keyword: String,
    absolute: bool,
    sleep_time: f64,
    page_limit: u32,
) -> Result<Vec<BasicHashMap>> {
    get_runtime()?
        .block_on(get_module(domain)?.search_by_keyword(keyword, absolute, sleep_time, page_limit))
}

#[no_mangle]
pub fn download_image(domain: String, url: String, image_name: String) -> Result<Option<String>> {
    get_runtime()?.block_on(get_module(domain)?.download_image(url, image_name))
}

#[no_mangle]
pub fn retrieve_image(domain: String, url: String) -> Result<String> {
    get_runtime()?.block_on(get_module(domain)?.retrieve_image(url))
}
