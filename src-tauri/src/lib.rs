#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use assets::*;
use downloader::{download, stop_download};
use saucer::*;
use searcher::{search_keyword, stop_search};
use tauri::Manager;
mod assets;
mod downloader;
mod image_merger;
mod models;
mod modules;
mod pdf_converter;
mod saucer;
mod searcher;

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
            get_info,
            get_chapters,
            get_module_type,
            get_modules,
            get_images,
            get_module_sample,
            download_image,
            merge,
            convert,
            retrieve_image,
            search_keyword_one,
            get_saucers_list,
            upload_image,
            yandex,
            tineye,
            iqdb,
            saucenao,
            search_keyword,
            stop_search,
            download,
            stop_download,
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
