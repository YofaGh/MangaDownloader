#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{from_str, to_value, Value};
use std::fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, File, OpenOptions};
use std::io::{Read, Seek, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;
mod assets;
mod downloader;
mod image_merger;
mod models;
mod modules;
mod pdf_converter;
mod saucer;
mod searcher;

#[tauri::command]
fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .ok();
}

#[tauri::command]
fn write_file(path: String, data: String) {
    let mut f: File = OpenOptions::new()
        .write(true)
        .read(true)
        .create(true)
        .open(&path)
        .unwrap();
    let _ = f.set_len(0);
    write!(f, "{}", &data).unwrap();
    f.rewind().ok();
}

#[tauri::command]
fn read_file(path: String) -> String {
    let mut f: File = OpenOptions::new()
        .write(true)
        .read(true)
        .open(&path)
        .unwrap();
    let mut buf: String = String::new();
    f.read_to_string(&mut buf).unwrap();
    buf
}

#[tauri::command]
fn remove_directory(path: String, recursive: bool) {
    if recursive {
        remove_dir_all(path).ok();
    } else if let Ok(entries) = read_dir(&path) {
        if entries.count() == 0 {
            remove_dir(path).ok();
        }
    }
}

#[derive(Clone, serde::Serialize)]
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

fn save_file(path: String, data: Value) {
    if !Path::new(&path).exists() {
        write_file(path, serde_json::to_string_pretty(&data).unwrap());
    }
}

fn load_up_checks(data_dir: String) {
    create_dir_all(&data_dir).ok();
    let default_settings: DefaultSettings = DefaultSettings::new(data_dir.clone());
    let file_array: [&str; 4] = [
        "library.json",
        "downloaded.json",
        "queue.json",
        "favorites.json",
    ];
    save_file(
        format!("{}/settings.json", data_dir),
        to_value(&default_settings).unwrap(),
    );
    for file in file_array {
        save_file(format!("{}/{}", data_dir, file), from_str("[]").unwrap());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_folder,
            remove_directory,
            read_file,
            write_file,
            assets::get_info,
            assets::get_chapters,
            assets::get_module_type,
            assets::get_modules,
            assets::merge,
            assets::convert,
            assets::retrieve_image,
            assets::search_keyword_one,
            saucer::get_saucers_list,
            saucer::upload_image,
            saucer::yandex,
            saucer::tineye,
            saucer::iqdb,
            saucer::saucenao,
            searcher::search_keyword,
            searcher::stop_search,
            downloader::download,
            downloader::stop_download,
        ])
        .setup(|app: &mut tauri::App| {
            let data_dir_path: String = app
                .path()
                .app_data_dir()
                .unwrap_or(PathBuf::new())
                .to_string_lossy()
                .to_string();
            load_up_checks(data_dir_path);
            #[cfg(debug_assertions)]
            app.get_webview_window("main").unwrap().open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
