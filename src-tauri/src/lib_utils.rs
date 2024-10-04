use libc::{self, c_char};
use libloading::{Error, Library, Symbol};
use serde_json::{from_str, Value};
use std::{
    collections::HashMap,
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

pub fn load_modules(modules_path: PathBuf) {
    unsafe { LIB = Some(Library::new(modules_path).unwrap()) };
}

pub fn unload_modules() {
    unsafe {
        let _ = LIB.take().unwrap().close();
    }
}

fn get_symbol<T>(name: &[u8]) -> Result<Symbol<T>, String> {
    unsafe {
        LIB.as_ref()
            .unwrap()
            .get(name)
            .map_err(|e: Error| e.to_string())
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

pub fn get_modules_version() -> String {
    unsafe {
        let version_ptr: *mut i8 = get_fn!("get_version", GetVersionFn)();
        let version: &str = CStr::from_ptr(version_ptr).to_str().unwrap();
        let version: String = version.to_string();
        free_string(version_ptr);
        version
    }
}
pub async fn get_modules() -> Vec<HashMap<String, Value>> {
    unsafe {
        let modules_ptr: *mut i8 = get_fn!("get_modules", GetModulesFn)();
        let modules: &str = CStr::from_ptr(modules_ptr).to_str().unwrap();
        let modules: Vec<HashMap<String, Value>> = from_str(modules).unwrap_or_default();
        free_string(modules_ptr);
        modules
    }
}

pub async fn get_info(domain: String, url: String) -> HashMap<String, Value> {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    unsafe {
        let info_ptr: *mut i8 = get_fn!("get_info", GetInfoFn)(domain.as_ptr(), url.as_ptr());
        let info: &str = CStr::from_ptr(info_ptr).to_str().unwrap();
        let info: HashMap<String, Value> = from_str(info).unwrap_or_default();
        free_string(info_ptr);
        info
    }
}

pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    unsafe {
        let chapters_ptr: *mut i8 =
            get_fn!("get_chapters", GetChaptersFn)(domain.as_ptr(), url.as_ptr());
        let chapters: &str = CStr::from_ptr(chapters_ptr).to_str().unwrap();
        let chapters: Vec<HashMap<String, String>> = from_str(chapters).unwrap_or_default();
        free_string(chapters_ptr);
        chapters
    }
}

pub async fn get_images(domain: String, manga: String, chapter: String) -> (Vec<String>, Value) {
    let domain: CString = CString::new(domain).unwrap();
    let manga: CString = CString::new(manga).unwrap();
    let chapter: CString = CString::new(chapter).unwrap();
    unsafe {
        let images_ptr: *mut i8 =
            get_fn!("get_images", GetImagesFn)(domain.as_ptr(), manga.as_ptr(), chapter.as_ptr());
        let images: &str = CStr::from_ptr(images_ptr).to_str().unwrap();
        let images: (Vec<String>, Value) = from_str(images).unwrap_or_default();
        free_string(images_ptr);
        images
    }
}

pub async fn download_image(domain: String, url: String, image_name: String) -> Option<String> {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    let image_name: CString = CString::new(image_name).unwrap();
    unsafe {
        let image_ptr: *mut i8 = get_fn!("download_image", DownloadImageFn)(
            domain.as_ptr(),
            url.as_ptr(),
            image_name.as_ptr(),
        );
        let image: &str = CStr::from_ptr(image_ptr).to_str().unwrap();
        let image: String = image.to_string();
        free_string(image_ptr);
        Some(image)
    }
}

pub async fn search_by_keyword(
    domain: String,
    keyword: String,
    sleep_time: f64,
    page_limit: u32,
    absolute: bool,
) -> Vec<HashMap<String, String>> {
    let domain: CString = CString::new(domain).unwrap();
    let keyword: CString = CString::new(keyword).unwrap();
    unsafe {
        let results_ptr: *mut i8 = get_fn!("search_by_keyword", SearchByKeywordFn)(
            domain.as_ptr(),
            keyword.as_ptr(),
            absolute,
            sleep_time,
            page_limit,
        );
        let results: &str = CStr::from_ptr(results_ptr).to_str().unwrap();
        let results: Vec<HashMap<String, String>> = from_str(results).unwrap_or_default();
        free_string(results_ptr);
        results
    }
}

pub async fn retrieve_image(domain: String, url: String) -> String {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    unsafe {
        let image_ptr: *mut i8 =
            get_fn!("retrieve_image", RetrieveImageFn)(domain.as_ptr(), url.as_ptr());
        let image: &str = CStr::from_ptr(image_ptr).to_str().unwrap();
        let image: String = image.to_string();
        free_string(image_ptr);
        image
    }
}

pub async fn get_module_sample(domain: String) -> HashMap<String, String> {
    let domain: CString = CString::new(domain).unwrap();
    unsafe {
        let sample_ptr: *mut i8 = get_fn!("get_module_sample", GetModuleSampleFn)(domain.as_ptr());
        let sample: &str = CStr::from_ptr(sample_ptr).to_str().unwrap();
        let sample: HashMap<String, String> = from_str(sample).unwrap_or_default();
        free_string(sample_ptr);
        sample
    }
}
