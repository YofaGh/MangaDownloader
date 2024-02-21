#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use std::process::Command;
use std::fs::{remove_dir_all, remove_dir, read_dir};
mod search_worker;
mod download_worker;

#[tauri::command]
fn open_folder(path: String) {
    Command::new("explorer")
        .args(["/select,", &path])
        .spawn()
        .unwrap();
}

#[tauri::command]
fn remove_directory(path: String, recursive: bool) {
    if recursive {
        remove_dir_all(path).unwrap();
    }
    else if read_dir(path.clone()).unwrap().count() == 0 {
        remove_dir(path).unwrap();
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_folder,
            remove_directory,
            search_worker::search_keyword,
            download_worker::download
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.get_window("main").unwrap().open_devtools();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}