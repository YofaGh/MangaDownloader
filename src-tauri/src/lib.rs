#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use assets::*;
use saucer::{get_saucers_list, sauce, upload_image};
use tauri::Manager;
mod assets;
mod image_merger;
mod models;
mod modules;
mod pdf_converter;
mod saucer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            open_folder,
            remove_directory,
            get_info,
            get_chapters,
            get_modules,
            get_images,
            get_module_sample,
            download_image,
            merge,
            convert,
            retrieve_image,
            search_by_keyword,
            get_saucers_list,
            upload_image,
            sauce,
            validate_image,
            create_directory,
            read_directory,
        ])
        .setup(|app: &mut tauri::App| {
            let data_dir_path: String = app
                .path()
                .app_data_dir()
                .unwrap_or_default()
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
