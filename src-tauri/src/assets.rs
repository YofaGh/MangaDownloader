use crate::{image_merger, pdf_converter};
use image::{open, DynamicImage};
use libc::{self, c_char};
use libloading::{Library, Symbol};
use rayon::prelude::*;
use serde::Serialize;
use serde_json::{from_str, to_string_pretty, to_value, Value};
use std::{
    collections::HashMap,
    ffi::{CStr, CString},
    fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, DirEntry, File, OpenOptions},
    io::{Error as DirError, Seek, Write},
    path::{Path, PathBuf},
    process::Command,
};
use tauri::{path::BaseDirectory::Resource, AppHandle, Manager};

type GetModulesFn = unsafe fn() -> *mut c_char;
type GetInfoFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetChaptersFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetImagesFn = unsafe fn(*const c_char, *const c_char, *const c_char) -> *mut c_char;
type SearchByKeywordFn = unsafe fn(*const c_char, *const c_char, bool, f64, u32) -> *mut c_char;
type DownloadImageFn = unsafe fn(*const c_char, *const c_char, *const c_char) -> *mut c_char;
type RetrieveImageFn = unsafe fn(*const c_char, *const c_char) -> *mut c_char;
type GetModuleSampleFn = unsafe fn(*const c_char) -> *mut c_char;
type FreeStringFn = unsafe fn(*mut c_char);
static mut LIB: Option<Library> = None;

#[derive(Clone, Serialize)]
struct DefaultSettings {
    auto_merge: bool,
    auto_convert: bool,
    load_covers: bool,
    sleep_time: f32,
    default_search_depth: i32,
    merge_method: String,
    download_path: Option<String>,
    data_dir_path: String,
}

impl DefaultSettings {
    fn new(data_dir: String) -> DefaultSettings {
        DefaultSettings {
            auto_merge: false,
            auto_convert: false,
            load_covers: true,
            sleep_time: 0.1,
            default_search_depth: 3,
            merge_method: String::from("Normal"),
            download_path: None,
            data_dir_path: data_dir,
        }
    }
}

fn free_string(ptr: *mut c_char) {
    unsafe {
        let _free_string: Symbol<FreeStringFn> = LIB.as_ref().unwrap().get(b"free_string").unwrap();
        _free_string(ptr);
    }
}

pub async fn load_up_checks(app: AppHandle) {
    unsafe {
        LIB = Some(
            Library::new(
                app.path()
                    .resolve("resources/modules.dll", Resource)
                    .unwrap(),
            )
            .unwrap(),
        );
    }
    let data_dir_path: String = app
        .path()
        .app_data_dir()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let default_settings: DefaultSettings = DefaultSettings::new(data_dir_path.clone());
    let file_array: [&str; 4] = [
        "library.json",
        "downloaded.json",
        "queue.json",
        "favorites.json",
    ];
    save_file(
        format!("{}/settings.json", data_dir_path),
        to_value(&default_settings).unwrap(),
    );
    file_array.into_iter().for_each(|file: &str| {
        save_file(
            format!("{}/{}", data_dir_path, file),
            Value::Array(Vec::new()),
        );
    });
}

fn save_file(path: String, data: Value) {
    if !Path::new(&path).exists() {
        let mut f: File = OpenOptions::new()
            .write(true)
            .read(true)
            .create(true)
            .open(&path)
            .unwrap();
        let _ = f.set_len(0);
        write!(f, "{}", &to_string_pretty(&data).unwrap()).unwrap();
        f.rewind().ok();
    }
}

#[tauri::command]
pub fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .ok();
}

#[tauri::command]
pub fn remove_directory(path: String, recursive: bool) {
    if recursive {
        remove_dir_all(path).ok();
    } else if let Ok(entries) = read_dir(&path) {
        if entries.count() == 0 {
            remove_dir(path).ok();
        }
    }
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    create_dir_all(&path).map_err(|e: DirError| e.to_string())
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<String>, String> {
    read_dir(&path)
        .map_err(|e: DirError| e.to_string())?
        .map(|entry: Result<DirEntry, DirError>| {
            entry.map(|e: DirEntry| e.path().to_str().unwrap().to_string())
        })
        .collect::<Result<Vec<String>, DirError>>()
        .map_err(|e: DirError| e.to_string())
}

#[tauri::command]
pub fn merge(path_to_source: String, path_to_destination: String, merge_method: String) -> String {
    match image_merger::merge_folder(path_to_source, path_to_destination, merge_method) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

#[tauri::command]
pub fn convert(path: String, pdf_name: String) -> String {
    match pdf_converter::convert_folder(path, pdf_name) {
        Ok(_) => "".to_string(),
        Err(err) => err.to_string(),
    }
}

pub fn detect_images(path_to_source: String) -> Vec<(DynamicImage, PathBuf)> {
    let mut dirs: Vec<Result<DirEntry, DirError>> = read_dir(path_to_source).unwrap().collect();
    dirs.sort_by(
        |p1: &Result<DirEntry, DirError>, p2: &Result<DirEntry, DirError>| {
            natord::compare(
                p1.as_ref().unwrap().path().to_str().unwrap(),
                p2.as_ref().unwrap().path().to_str().unwrap(),
            )
        },
    );
    dirs.into_par_iter()
        .filter_map(|dir: Result<DirEntry, DirError>| {
            let path: PathBuf = dir.unwrap().path();
            if matches!(
                path.extension().and_then(|ext| ext.to_str()),
                Some("jpg") | Some("png") | Some("jpeg") | Some("gif") | Some("webp")
            ) {
                match open(path.clone()) {
                    Ok(image) => Some((image, path)),
                    Err(_) => None,
                }
            } else {
                None
            }
        })
        .collect()
}

#[tauri::command]
pub fn validate_image(path: String) -> bool {
    match open(path) {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[tauri::command]
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

#[tauri::command]
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

#[tauri::command]
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

#[tauri::command]
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

#[tauri::command]
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

#[tauri::command]
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

#[tauri::command]
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

#[tauri::command]
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
