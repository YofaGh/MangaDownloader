use crate::{create_module_registry, modules::*, prelude::*};

use std::sync::LazyLock;

create_module_registry!(
    Hentaifox,
    Imhentai,
    Luscious,
    Mangapark,
    Manhuascan,
    Manytoon,
    NhentaiNet,
    NhentaiXxx,
    Nyahentai,
    Readonepiece,
    Simplyhentai,
    Toonily,
    Truemanga
);

pub fn get_module(domain: String) -> Result<&'static BoxModule> {
    MODULE_INSTANCES
        .get(domain.as_str())
        .ok_or_else(|| Error::Other(format!("Domain {} is not supported", domain)))
}

pub fn get_all_modules() -> Vec<&'static BoxModule> {
    MODULE_INSTANCES.values().collect()
}
