use image::{open, DynamicImage};
use libc::{self, c_char};
use libloading::{Library, Symbol};
use rayon::prelude::*;
use reqwest::get;
use semver::Version;
use serde::Serialize;
use serde_json::{to_string_pretty, to_value, Value};
use std::{
    ffi::CStr,
    fs::{read_dir, write, DirEntry, File, OpenOptions},
    io::{Error, Seek, Write},
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
use tokio::time::{sleep, Duration};

type GetVersionFn = unsafe fn() -> *mut c_char;
type FreeStringFn = unsafe fn(*mut c_char);
pub static mut LIB: Option<Library> = None;
const GITHUB_URL: &str = "https://raw.githubusercontent.com/YofaGh/MangaDownloader/master/";

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

pub fn free_string(ptr: *mut c_char) {
    unsafe {
        let _free_string: Symbol<FreeStringFn> = LIB.as_ref().unwrap().get(b"free_string").unwrap();
        _free_string(ptr);
    }
}

pub fn load_up_checks(app: AppHandle) {
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
    app.get_webview_window("splashscreen")
        .unwrap()
        .close()
        .unwrap();
    app.get_webview_window("main").unwrap().show().unwrap();
}

pub fn load_modules(modules_path: PathBuf) {
    unsafe { LIB = Some(Library::new(modules_path).unwrap()) };
}

fn unload_modules() {
    unsafe {
        let _ = LIB.take().unwrap().close();
    }
}

pub async fn check_and_update_dll(window: WebviewWindow, modules_path: PathBuf) {
    let current_version: Version = Version::parse(&get_modules_version()).unwrap();
    match get(GITHUB_URL.to_owned() + "modules-version.txt").await {
        Ok(response) => {
            let version_str: String = response.text().await.unwrap();
            let latest_version: Version = Version::parse(version_str.trim()).unwrap();
            if latest_version > current_version {
                window.emit("updateStatus", "Updating Modules").unwrap();
                unload_modules();
                match get(GITHUB_URL.to_owned() + "src-tauri/resources/modules.dll").await {
                    Ok(response) => {
                        let new_dll_content: Vec<u8> = response.bytes().await.unwrap().to_vec();
                        write(&modules_path, new_dll_content).unwrap();
                    }
                    Err(_) => {
                        window
                            .emit("updateStatus", "Failed to update modules")
                            .unwrap();
                        sleep(Duration::from_secs(1)).await;
                    }
                }
            }
        }
        Err(_) => {
            window
                .emit("updateStatus", "Failed to check for updates")
                .unwrap();
            sleep(Duration::from_secs(1)).await;
        }
    }
    load_modules(modules_path);
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

pub fn detect_images(path_to_source: String) -> Vec<(DynamicImage, PathBuf)> {
    let mut dirs: Vec<Result<DirEntry, Error>> = read_dir(path_to_source).unwrap().collect();
    dirs.sort_by(
        |p1: &Result<DirEntry, Error>, p2: &Result<DirEntry, Error>| {
            natord::compare(
                p1.as_ref().unwrap().path().to_str().unwrap(),
                p2.as_ref().unwrap().path().to_str().unwrap(),
            )
        },
    );
    dirs.into_par_iter()
        .filter_map(|dir: Result<DirEntry, Error>| {
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

pub fn get_modules_version() -> String {
    unsafe {
        let _get_modules_version: Symbol<GetVersionFn> =
            LIB.as_ref().unwrap().get(b"get_version").unwrap();
        let version_ptr: *mut i8 = _get_modules_version();
        let version: &str = CStr::from_ptr(version_ptr).to_str().unwrap();
        let version: String = version.to_string();
        free_string(version_ptr);
        version
    }
}
