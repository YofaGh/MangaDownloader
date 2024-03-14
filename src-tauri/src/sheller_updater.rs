use reqwest::{
    blocking::{get, Response},
    Error,
};
use std::env::consts::FAMILY;
use std::io::prelude::{Read, Write};
use std::path::PathBuf;
use std::{
    fs::{read, remove_file, File},
    io::Cursor,
};
use tauri::{Manager, Window};

#[tauri::command]
pub fn update_sheller(window: Window) {
    window
        .emit("updateStatus", Some("Checking For Update..."))
        .unwrap();
    if FAMILY == "windows" {
        update_win(window);
    }
}

fn update_win(window: Window) {
    window
        .emit("updateStatus", Some("Downloading Bots..."))
        .unwrap();
    let data_dir_path: String = window
        .app_handle()
        .path_resolver()
        .app_data_dir()
        .unwrap_or(PathBuf::new())
        .to_string_lossy()
        .to_string();
    let response: Result<Response, Error> = get("https://github.com/YofaGh/MangaDownloader/raw/master/cli/sheller.py");
    match response {
        Ok(mut content) => {
            let mut file: File =
                File::create(format!("{}/cli.py", data_dir_path)).expect("Failed to create file");
            let mut content_string: String = String::new();
            content
                .read_to_string(&mut content_string)
                .expect("Failed to read content");
            file.write_all(content_string.as_bytes())
                .expect("Failed to write to file");
            window.emit("updateDownloadProgress", Some(25)).unwrap();
        }
        Err(_) => {}
    }
    let response: Result<Response, Error> = get("https://github.com/YofaGh/MangaScraper/archive/refs/heads/master.zip");
    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                let mut file: File = File::create(format!("{}/cli.zip", data_dir_path))
                    .expect("Failed to create file");
                let content = resp.bytes().expect("Failed to read response bytes");
                file.write_all(&content).expect("Failed to write to file");
            }
            let archive: Vec<u8> = read(format!("{}/cli.zip", data_dir_path)).unwrap();
            let target_dir: PathBuf = PathBuf::from(format!("{}/mangascraper", data_dir_path));
            let _ = zip_extract::extract(Cursor::new(archive), &target_dir, true);
            remove_file(format!("{}/cli.zip", data_dir_path)).expect("msg");
            window.emit("updateDownloadProgress", Some(100)).unwrap();
        }
        Err(_) => {}
    }
    window.get_window("splashscreen").unwrap().close().unwrap();
    window.get_window("main").unwrap().show().unwrap();
}