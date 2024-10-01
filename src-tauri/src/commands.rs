use crate::{
    assets::{check_and_update_dll, free_string, load_modules, load_up_checks, LIB},
    image_merger::merge_folder,
    pdf_converter::convert_folder,
    saucer::{upload, yandex, tineye, iqdb, saucenao}
};
use image::open;
use libc::{self, c_char};
use libloading::Symbol;
use serde_json::{from_str, Value};
use std::{
    collections::HashMap,
    ffi::{CStr, CString},
    fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, DirEntry},
    io::Error,
    path::PathBuf,
    process::Command,
};
use tauri::{command, path::BaseDirectory::Resource, AppHandle, Emitter, Manager, WebviewWindow};

type GetModulesFn = unsafe fn() -> *mut c_char;
type GetInfoFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetChaptersFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetImagesFn = unsafe fn(*const c_char, *const c_char, *const c_char) -> *mut c_char;
type SearchByKeywordFn = unsafe fn(*const c_char, *const c_char, bool, f64, u32) -> *mut c_char;
type DownloadImageFn = unsafe fn(*const c_char, *const c_char, *const c_char) -> *mut c_char;
type RetrieveImageFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetModuleSampleFn = unsafe fn(*const c_char) -> *mut c_char;

#[command]
pub async fn update_checker(app: AppHandle) {
    let modules_path: PathBuf = app
        .path()
        .resolve("resources/modules.dll", Resource)
        .unwrap();
    load_modules(modules_path.clone());
    let window: WebviewWindow = app.get_webview_window("splashscreen").unwrap();
    window.emit("updateStatus", "Checking for updates").unwrap();
    check_and_update_dll(window, modules_path).await;
    load_up_checks(app);
}

#[command]
pub fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .ok();
}

#[command]
pub fn remove_directory(path: String, recursive: bool) {
    if recursive {
        remove_dir_all(path).ok();
    } else if let Ok(entries) = read_dir(&path) {
        if entries.count() == 0 {
            remove_dir(path).ok();
        }
    }
}

#[command]
pub async fn create_directory(path: String) -> Result<(), String> {
    create_dir_all(&path).map_err(|e: Error| e.to_string())
}

#[command]
pub fn read_directory(path: String) -> Result<Vec<String>, String> {
    read_dir(&path)
        .map_err(|e: Error| e.to_string())?
        .map(|entry: Result<DirEntry, Error>| {
            entry.map(|e: DirEntry| e.path().to_str().unwrap().to_string())
        })
        .collect::<Result<Vec<String>, Error>>()
        .map_err(|e: Error| e.to_string())
}

#[command]
pub fn merge(path_to_source: String, path_to_destination: String, merge_method: String) -> String {
    match merge_folder(path_to_source, path_to_destination, merge_method) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[command]
pub fn convert(path: String, pdf_name: String) -> String {
    match convert_folder(path, pdf_name) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[command]
pub fn validate_image(path: String) -> bool {
    match open(path) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[command]
pub async fn get_modules() -> Vec<HashMap<String, Value>> {
    unsafe {
        let _get_modules: Symbol<GetModulesFn> = LIB.as_ref().unwrap().get(b"get_modules").unwrap();
        let modules_ptr: *mut i8 = _get_modules();
        let modules: &str = CStr::from_ptr(modules_ptr).to_str().unwrap();
        let modules: Vec<HashMap<String, Value>> = from_str(modules).unwrap_or_default();
        free_string(modules_ptr);
        modules
    }
}

#[command]
pub async fn get_info(domain: String, url: String) -> HashMap<String, Value> {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    unsafe {
        let _get_info: Symbol<GetInfoFn> = LIB.as_ref().unwrap().get(b"get_info").unwrap();
        let info_ptr: *mut i8 = _get_info(domain.as_ptr(), url.as_ptr());
        let info: &str = CStr::from_ptr(info_ptr).to_str().unwrap();
        let info: HashMap<String, Value> = from_str(info).unwrap_or_default();
        free_string(info_ptr);
        info
    }
}

#[command]
pub async fn get_chapters(domain: String, url: String) -> Vec<HashMap<String, String>> {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    unsafe {
        let _get_chapters: Symbol<GetChaptersFn> =
            LIB.as_ref().unwrap().get(b"get_chapters").unwrap();
        let chapters_ptr: *mut i8 = _get_chapters(domain.as_ptr(), url.as_ptr());
        let chapters: &str = CStr::from_ptr(chapters_ptr).to_str().unwrap();
        let chapters: Vec<HashMap<String, String>> = from_str(chapters).unwrap_or_default();
        free_string(chapters_ptr);
        chapters
    }
}

#[command]
pub async fn get_images(domain: String, manga: String, chapter: String) -> (Vec<String>, Value) {
    let domain: CString = CString::new(domain).unwrap();
    let manga: CString = CString::new(manga).unwrap();
    let chapter: CString = CString::new(chapter).unwrap();
    unsafe {
        let _get_images: Symbol<GetImagesFn> = LIB.as_ref().unwrap().get(b"get_images").unwrap();
        let images_ptr: *mut i8 = _get_images(domain.as_ptr(), manga.as_ptr(), chapter.as_ptr());
        let images: &str = CStr::from_ptr(images_ptr).to_str().unwrap();
        let images: (Vec<String>, Value) = from_str(images).unwrap_or_default();
        free_string(images_ptr);
        images
    }
}

#[command]
pub async fn download_image(domain: String, url: String, image_name: String) -> Option<String> {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    let image_name: CString = CString::new(image_name).unwrap();
    unsafe {
        let _download_image: Symbol<DownloadImageFn> =
            LIB.as_ref().unwrap().get(b"download_image").unwrap();
        let image_ptr: *mut i8 =
            _download_image(domain.as_ptr(), url.as_ptr(), image_name.as_ptr());
        let image: &str = CStr::from_ptr(image_ptr).to_str().unwrap();
        let image: String = image.to_string();
        free_string(image_ptr);
        Some(image)
    }
}

#[command]
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
        let _search_by_keyword: Symbol<SearchByKeywordFn> =
            LIB.as_ref().unwrap().get(b"search_by_keyword").unwrap();
        let results_ptr: *mut i8 = _search_by_keyword(
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

#[command]
pub async fn retrieve_image(domain: String, url: String) -> String {
    let domain: CString = CString::new(domain).unwrap();
    let url: CString = CString::new(url).unwrap();
    unsafe {
        let _retrieve_image: Symbol<RetrieveImageFn> =
            LIB.as_ref().unwrap().get(b"retrieve_image").unwrap();
        let image_ptr: *mut i8 = _retrieve_image(domain.as_ptr(), url.as_ptr());
        let image: &str = CStr::from_ptr(image_ptr).to_str().unwrap();
        let image: String = image.to_string();
        free_string(image_ptr);
        image
    }
}

#[command]
pub async fn get_module_sample(domain: String) -> HashMap<String, String> {
    let domain: CString = CString::new(domain).unwrap();
    unsafe {
        let _get_module_sample: Symbol<GetModuleSampleFn> =
            LIB.as_ref().unwrap().get(b"get_module_sample").unwrap();
        let sample_ptr: *mut i8 = _get_module_sample(domain.as_ptr());
        let sample: &str = CStr::from_ptr(sample_ptr).to_str().unwrap();
        let sample: HashMap<String, String> = from_str(sample).unwrap_or_default();
        free_string(sample_ptr);
        sample
    }
}

#[command]
pub async fn sauce(saucer: String, url: String) -> Vec<HashMap<String, String>> {
    match saucer.as_str() {
        "yandex" => yandex(url.as_str()).await.unwrap_or_default(),
        "tineye" => tineye(url.as_str()).await.unwrap_or_default(),
        "iqdb" => iqdb(url.as_str()).await.unwrap_or_default(),
        "saucenao" => saucenao(url.as_str()).await.unwrap_or_default(),
        _ => Vec::new(),
    }
}

#[command]
pub async fn upload_image(path: String) -> String {
    upload(path.as_str()).await.unwrap_or_default()
}

#[command]
pub fn get_saucers_list() -> Vec<String> {
    vec![
        "yandex".to_string(),
        "tineye".to_string(),
        "iqdb".to_string(),
        "saucenao".to_string(),
    ]
}
