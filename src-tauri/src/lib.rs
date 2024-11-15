#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod assets;
mod commands;
mod errors;
mod image_merger;
mod lib_utils;
mod pdf_converter;
mod saucer;
use assets::load_up_checks;
use commands::*;
use tauri::{generate_context, generate_handler, App, Builder, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(generate_handler![
            merge,
            sauce,
            convert,
            get_info,
            get_images,
            get_modules,
            open_folder,
            get_chapters,
            upload_image,
            download_image,
            retrieve_image,
            validate_image,
            read_directory,
            update_checker,
            create_directory,
            get_saucers_list,
            remove_directory,
            get_data_dir_path,
            get_module_sample,
            search_by_keyword,
        ])
        .setup(|app: &mut App| {
            load_up_checks(app.path().app_data_dir().unwrap_or_default());
            #[cfg(debug_assertions)]
            app.get_webview_window("main").unwrap().open_devtools();
            Ok(())
        })
        .run(generate_context!())
        .expect("error while running tauri application");
}
