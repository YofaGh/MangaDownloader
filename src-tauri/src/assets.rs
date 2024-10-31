use crate::lib_utils::{get_modules_version, load_modules, unload_modules};
use image::{open, DynamicImage};
use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use reqwest::get;
use semver::Version;
use serde::Serialize;
use serde_json::{to_string_pretty, to_value, Value};
use std::{
    fs::{read_dir, write, DirEntry, File, OpenOptions},
    io::Write,
    path::PathBuf,
};
use tauri::{Emitter, WebviewWindow};
use tokio::time::{sleep, Duration};

const GITHUB_URL: &str = "https://raw.githubusercontent.com/YofaGh/MangaDownloader/master/";

#[derive(Clone, Serialize)]
struct Settings {
    auto_merge: bool,
    auto_convert: bool,
    load_covers: bool,
    sleep_time: f32,
    default_search_depth: i32,
    merge_method: String,
    download_path: Option<String>,
}

impl Default for Settings {
    fn default() -> Settings {
        Settings {
            auto_merge: false,
            auto_convert: false,
            load_covers: true,
            sleep_time: 0.1,
            default_search_depth: 3,
            merge_method: String::from("Normal"),
            download_path: None,
        }
    }
}

pub fn load_up_checks(data_dir_path: PathBuf) {
    let default_settings: Settings = Settings::default();
    save_file(
        data_dir_path.join("settings.json"),
        to_value(&default_settings).unwrap(),
    );
    let file_array: [&str; 4] = [
        "library.json",
        "downloaded.json",
        "queue.json",
        "favorites.json",
    ];
    file_array.into_iter().for_each(|file: &str| {
        save_file(data_dir_path.join(file), Value::Array(Vec::new()));
    });
}

pub async fn check_and_update_dll(window: WebviewWindow, modules_path: PathBuf) {
    emit_status(&window, "Checking for updates");
    let current_version: Version = Version::parse(&get_modules_version().unwrap()).unwrap();
    match get(GITHUB_URL.to_owned() + "modules-version.txt").await {
        Ok(response) => {
            let version_str: String = response.text().await.unwrap();
            let latest_version: Version = Version::parse(version_str.trim()).unwrap();
            if latest_version > current_version {
                window.emit("updateStatus", "Updating Modules").unwrap();
                emit_status(&window, "Updating Modules");
                unload_modules().unwrap();
                match get(GITHUB_URL.to_owned() + "src-tauri/resources/modules.dll").await {
                    Ok(response) => {
                        let new_dll_content: Vec<u8> = response.bytes().await.unwrap().to_vec();
                        write(&modules_path, new_dll_content).unwrap();
                    }
                    Err(_) => {
                        emit_status(&window, "Failed to update modules");
                        sleep(Duration::from_secs(1)).await;
                    }
                }
                load_modules(modules_path).unwrap();
            }
        }
        Err(_) => {
            emit_status(&window, "Failed to check for updates");
            sleep(Duration::from_secs(1)).await;
        }
    }
}

fn save_file(path: PathBuf, data: Value) {
    if !path.exists() {
        let mut file: File = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)
            .unwrap();
        file.write_all(to_string_pretty(&data).unwrap_or_default().as_bytes())
            .unwrap();
        file.flush().unwrap();
    }
}

fn emit_status(window: &WebviewWindow, message: &str) {
    window.emit("updateStatus", message).unwrap();
}

pub fn detect_images(path_to_source: &str) -> Vec<(DynamicImage, PathBuf)> {
    let dirs: Vec<DirEntry> = read_dir(path_to_source)
        .unwrap()
        .filter_map(Result::ok)
        .collect();
    let mut dirs: Vec<PathBuf> = dirs
        .into_iter()
        .map(|entry: DirEntry| entry.path())
        .filter(|path: &PathBuf| {
            matches!(
                path.extension().and_then(|ext| ext.to_str()),
                Some("jpg") | Some("png") | Some("jpeg") | Some("gif") | Some("webp")
            )
        })
        .collect();
    dirs.sort_by(|a: &PathBuf, b: &PathBuf| {
        natord::compare(a.to_str().unwrap_or(""), b.to_str().unwrap_or(""))
    });
    dirs.into_par_iter()
        .filter_map(|path: PathBuf| open(&path).ok().map(|img: DynamicImage| (img, path)))
        .collect()
}