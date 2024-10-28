use libc::{self, c_char};
use libloading::{Error as LibError, Library, Symbol};
use serde_json::{from_str, Value};
use std::{
    collections::HashMap,
    error::Error as StdError,
    ffi::{CStr, CString},
    path::PathBuf,
};

static mut LIB: Option<Library> = None;
type FreeStringFn = unsafe fn(*mut c_char);
type GetVersionFn = unsafe fn() -> *mut c_char;
type GetModulesFn = unsafe fn() -> *mut c_char;
type GetModuleSampleFn = unsafe fn(*const c_char) -> *mut c_char;
type GetInfoFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetChaptersFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type RetrieveImageFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetImagesFn = unsafe fn(*const c_char, *const c_char, *const c_char) -> *mut c_char;
type DownloadImageFn = unsafe fn(*const c_char, *const c_char, *const c_char) -> *mut c_char;
type SearchByKeywordFn = unsafe fn(*const c_char, *const c_char, bool, f64, u32) -> *mut c_char;

pub fn load_modules(modules_path: PathBuf) -> Result<(), Box<dyn StdError>> {
    unsafe { LIB = Some(Library::new(modules_path)?) };
    Ok(())
}

pub fn unload_modules() -> Result<(), Box<dyn StdError>> {
    unsafe {
        LIB.take().unwrap().close()?;
    }
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

macro_rules! get_fn {
    ($name:expr, $type:ty) => {
        get_symbol::<$type>($name.as_bytes()).unwrap()
    };
}

fn free_string(ptr: *mut c_char) {
    unsafe {
        get_fn!("free_string", FreeStringFn)(ptr);
    }
}

pub fn get_modules_version() -> Result<String, Box<dyn StdError>> {
    unsafe {
        let version_ptr: *mut i8 = get_fn!("get_version", GetVersionFn)();
        let version: &str = CStr::from_ptr(version_ptr).to_str()?;
        let version: String = version.to_string();
        free_string(version_ptr);
        Ok(version)
    }
}

pub async fn get_modules() -> Result<Vec<HashMap<String, Value>>, Box<dyn StdError>> {
    unsafe {
        let modules_ptr: *mut i8 = get_fn!("get_modules", GetModulesFn)();
        let modules: &str = CStr::from_ptr(modules_ptr).to_str()?;
        let modules: Vec<HashMap<String, Value>> = from_str(modules)?;
        free_string(modules_ptr);
        Ok(modules)
    }
}

pub async fn get_info(
    domain: String,
    url: String,
) -> Result<HashMap<String, Value>, Box<dyn StdError>> {
    let domain: CString = CString::new(domain)?;
    let url: CString = CString::new(url)?;
    unsafe {
        let info_ptr: *mut i8 = get_fn!("get_info", GetInfoFn)(domain.as_ptr(), url.as_ptr());
        let info: &str = CStr::from_ptr(info_ptr).to_str()?;
        let info: HashMap<String, Value> = from_str(info)?;
        free_string(info_ptr);
        Ok(info)
    }
}

pub async fn get_chapters(
    domain: String,
    url: String,
) -> Result<Vec<HashMap<String, String>>, Box<dyn StdError>> {
    let domain: CString = CString::new(domain)?;
    let url: CString = CString::new(url)?;
    unsafe {
        let chapters_ptr: *mut i8 =
            get_fn!("get_chapters", GetChaptersFn)(domain.as_ptr(), url.as_ptr());
        let chapters: &str = CStr::from_ptr(chapters_ptr).to_str()?;
        let chapters: Vec<HashMap<String, String>> = from_str(chapters)?;
        free_string(chapters_ptr);
        Ok(chapters)
    }
}

pub async fn get_images(
    domain: String,
    manga: String,
    chapter: String,
) -> Result<(Vec<String>, Value), Box<dyn StdError>> {
    let domain: CString = CString::new(domain)?;
    let manga: CString = CString::new(manga)?;
    let chapter: CString = CString::new(chapter)?;
    unsafe {
        let images_ptr: *mut i8 =
            get_fn!("get_images", GetImagesFn)(domain.as_ptr(), manga.as_ptr(), chapter.as_ptr());
        let images: &str = CStr::from_ptr(images_ptr).to_str()?;
        let images: (Vec<String>, Value) = from_str(images)?;
        free_string(images_ptr);
        Ok(images)
    }
}

pub async fn download_image(
    domain: String,
    url: String,
    image_name: String,
) -> Result<Option<String>, Box<dyn StdError>> {
    let domain: CString = CString::new(domain)?;
    let url: CString = CString::new(url)?;
    let image_name: CString = CString::new(image_name)?;
    unsafe {
        let image_ptr: *mut i8 = get_fn!("download_image", DownloadImageFn)(
            domain.as_ptr(),
            url.as_ptr(),
            image_name.as_ptr(),
        );
        let image: &str = CStr::from_ptr(image_ptr).to_str()?;
        let image: String = image.to_string();
        free_string(image_ptr);
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
    let domain: CString = CString::new(domain)?;
    let keyword: CString = CString::new(keyword)?;
    unsafe {
        let results_ptr: *mut i8 = get_fn!("search_by_keyword", SearchByKeywordFn)(
            domain.as_ptr(),
            keyword.as_ptr(),
            absolute,
            sleep_time,
            page_limit,
        );
        let results: &str = CStr::from_ptr(results_ptr).to_str()?;
        let results: Vec<HashMap<String, String>> = from_str(results)?;
        free_string(results_ptr);
        Ok(results)
    }
}

pub async fn retrieve_image(domain: String, url: String) -> Result<String, Box<dyn StdError>> {
    let domain: CString = CString::new(domain)?;
    let url: CString = CString::new(url)?;
    unsafe {
        let image_ptr: *mut i8 =
            get_fn!("retrieve_image", RetrieveImageFn)(domain.as_ptr(), url.as_ptr());
        let image: &str = CStr::from_ptr(image_ptr).to_str()?;
        let image: String = image.to_string();
        free_string(image_ptr);
        Ok(image)
    }
}

pub async fn get_module_sample(
    domain: String,
) -> Result<HashMap<String, String>, Box<dyn StdError>> {
    let domain: CString = CString::new(domain)?;
    unsafe {
        let sample_ptr: *mut i8 = get_fn!("get_module_sample", GetModuleSampleFn)(domain.as_ptr());
        let sample: &str = CStr::from_ptr(sample_ptr).to_str()?;
        let sample: HashMap<String, String> = from_str(sample)?;
        free_string(sample_ptr);
        Ok(sample)
    }
}
