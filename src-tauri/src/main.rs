#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{from_str, to_value, Value};
use std::fs::{create_dir_all, read, read_dir, remove_dir, remove_dir_all, OpenOptions};
use std::io::{Cursor, Read, Seek, Write};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;
mod download_worker;
mod search_worker;

#[tauri::command]
fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .unwrap();
}

#[tauri::command]
fn get_platform() -> bool {
    return std::env::consts::FAMILY == "windows";
}

#[tauri::command]
fn write_file(path: String, data: String) {
    let mut f = OpenOptions::new()
        .write(true)
        .read(true)
        .create(true)
        .open(&path)
        .unwrap();
    let _ = f.set_len(0);
    write!(f, "{}", &data).unwrap();
    f.rewind().unwrap();
}

#[tauri::command]
fn read_file(path: String) -> String {
    let mut f = OpenOptions::new()
        .write(true)
        .read(true)
        .open(&path)
        .unwrap();
    let mut buf = String::new();
    f.read_to_string(&mut buf).unwrap();
    buf
}

#[tauri::command]
fn extract_sheller(data_dir_path: String, handle: tauri::AppHandle) {
    let resource_path = handle
        .path_resolver()
        .resolve_resource("../cli/PyShellerBundle.zip")
        .expect("failed to resolve resource");
    let archive: Vec<u8> = read(resource_path).unwrap();
    let target_dir = PathBuf::from(&data_dir_path);
    let _ = zip_extract::extract(Cursor::new(archive), &target_dir, true);
}

#[tauri::command]
fn remove_directory(path: String, recursive: bool) {
    if recursive {
        let _ = remove_dir_all(path);
    } else if let Ok(entries) = read_dir(&path) {
        if entries.count() == 0 {
            let _ = remove_dir(path);
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
    sheller_arg: String,
}

fn save_file(path: String, data: Value) {
    if !Path::new(&path).exists() {
        let _ = write_file(path, serde_json::to_string_pretty(&data).unwrap());
    }
}

fn load_up_checks(data_dir: String) {
    let _ = create_dir_all(&data_dir);
    let default_settings: DefaultSettings = DefaultSettings {
        auto_merge: false,
        auto_convert: false,
        load_covers: true,
        sleep_time: 0.1,
        default_search_depth: 3,
        merge_method: String::from("Normal"),
        download_path: None,
        sheller_arg: data_dir.clone(),
    };
    let file_array: [&str; 4] = [
        "library.json",
        "downloaded.json",
        "queue.json",
        "favorites.json",
    ];
    save_file(
        format!("{}\\settings.json", data_dir),
        to_value(&default_settings).unwrap(),
    );
    for file in file_array {
        save_file(format!("{}\\{}", data_dir, file), from_str("[]").unwrap());
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_folder,
            remove_directory,
            read_file,
            write_file,
            get_platform,
            search_worker::search_keyword,
            search_worker::stop_search,
            download_worker::download,
            download_worker::stop_download,
        ])
        .setup(|app: &mut tauri::App| {
            let data_dir_path: String = app
                .path_resolver()
                .app_data_dir()
                .unwrap_or(PathBuf::new())
                .to_string_lossy()
                .to_string();
            if std::env::consts::FAMILY == "windows"
                && !Path::new(&format!("{}\\sheller.py", &data_dir_path)).exists()
            {
                extract_sheller(data_dir_path.clone(), app.handle());
            }
            load_up_checks(data_dir_path);
            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}