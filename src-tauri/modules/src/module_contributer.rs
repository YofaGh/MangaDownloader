use crate::create_module_registry;
use crate::modules::*;
use crate::prelude::*;

use std::sync::LazyLock;

create_module_registry!(
    ("hentaifox.com", Hentaifox),
    ("imhentai.xxx", Imhentai),
    ("luscious.net", Luscious),
    ("mangapark.to", Mangapark),
    ("manhuascan.us", Manhuascan),
    ("manytoon.com", Manytoon),
    ("nhentai.net", NhentaiNet),
    ("nhentai.xxx", NhentaiXxx),
    ("nyahentai.red", Nyahentai),
    ("simplyhentai.org", Simplyhentai),
    ("readonepiece.com", Readonepiece),
    ("toonily.com", Toonily),
    ("truemanga.com", Truemanga)
);

pub fn get_module(domain: String) -> Result<&'static BoxModule> {
    MODULE_INSTANCES
        .get(domain.as_str())
        .ok_or_else(|| Error::Other(format!("Domain {} is not supported", domain)))
}

pub fn get_all_modules() -> Vec<&'static BoxModule> {
    MODULE_INSTANCES.values().collect()
}
