use reqwest::{
    blocking::{get, Response},
    Error,
};
use scraper::{Html, Selector};
use serde_json::{from_str, json, to_string, Value};
use std::{
    fs::{read, remove_dir_all, remove_file, File, OpenOptions},
    io::{Cursor, Read, Seek, Write},
    path::PathBuf,
};
use tauri::{Manager, Window};

fn read_settings(path: String) -> Value {
    let mut f: File = OpenOptions::new()
        .write(true)
        .read(true)
        .open(&path)
        .unwrap();
    let mut buf: String = String::new();
    f.read_to_string(&mut buf).unwrap();
    let settings: Value = from_str(&buf).unwrap();
    settings
}

fn write_settings(path: String, data: String) {
    let mut f: File = OpenOptions::new()
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
pub fn update_sheller(window: Window) {
    window
        .emit("updateStatus", Some("Checking For Update..."))
        .unwrap();
    let data_dir_path: String = window
        .app_handle()
        .path_resolver()
        .app_data_dir()
        .unwrap_or(PathBuf::new())
        .to_string_lossy()
        .to_string();
    let settings: Value = read_settings(format!("{}/settings.json", data_dir_path));
    if cfg!(target_family = "windows") {
        update_win(window.clone(), data_dir_path, settings);
    } else {
        update_unix(window.clone(), data_dir_path, settings);
    }
    window.emit("event", Some(())).unwrap();
}

fn update_win(window: Window, data_dir_path: String, mut settings: Value) {
    window
        .emit("updateStatus", Some("Downloading Bots..."))
        .unwrap();
    let response: Result<Response, Error> =
        get("https://github.com/YofaGh/MangaDownloader/releases/expanded_assets/latest");
    match response {
        Ok(content) => {
            let html: String = content.text().unwrap();
            let document: Html = Html::parse_document(&html);
            let selector: Selector = Selector::parse("a").unwrap();
            let href: scraper::ElementRef<'_> = document
                .select(&selector)
                .filter(|el| {
                    el.value()
                        .attr("href")
                        .map(|href| href.contains("PyBundle"))
                        .unwrap_or(false)
                })
                .next()
                .unwrap();
            let mut sheller_name: String = "".to_string();
            for te in href.text().collect::<Vec<_>>() {
                if te.contains("PyBundle") {
                    sheller_name = te.to_string();
                    break;
                }
            }
            let latest_sheller_version: &str = sheller_name.split("-").collect::<Vec<&str>>()[1]
                .rsplit_once('.')
                .unwrap()
                .0;
            if latest_sheller_version != settings.get("bundle_version").unwrap().as_str().unwrap() {
                window
                    .emit("updateStatus", Some("Updating Bundle..."))
                    .unwrap();
                let response: Result<Response, Error> = get(format!(
                    "https://github.com{}",
                    href.attr("href").unwrap().to_string()
                ));
                match response {
                    Ok(resp) => {
                        if resp.status().is_success() {
                            let mut file: File =
                                File::create(format!("{}/python.zip", data_dir_path))
                                    .expect("Failed to create file");
                            let content = resp.bytes().expect("Failed to read response bytes");
                            file.write_all(&content).expect("Failed to write to file");
                            *settings.get_mut("bundle_version").unwrap() =
                                json!(latest_sheller_version);
                            let _ = remove_dir_all(format!("{}/python", data_dir_path));
                            let archive: Vec<u8> =
                                read(format!("{}/python.zip", data_dir_path)).unwrap();
                            let target_dir: PathBuf = PathBuf::from(&data_dir_path);
                            let _ = zip_extract::extract(Cursor::new(archive), &target_dir, true);
                            let _ = remove_file(format!("{}/python.zip", data_dir_path));
                            write_settings(
                                format!("{}/settings.json", data_dir_path),
                                to_string(&settings).unwrap(),
                            );
                        }
                    }
                    Err(_) => {}
                }
            }
        }
        Err(_) => {}
    }
    let response: Result<Response, Error> =
        get("https://github.com/YofaGh/MangaDownloader/raw/master/cli/sheller.py");
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
    let response: Result<Response, Error> =
        get("https://github.com/YofaGh/MangaScraper/archive/refs/heads/master.zip");
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

#[cfg(target_family = "windows")]
fn update_unix(_window: Window, _data_dir_path: String, mut _settings: Value) {}

#[cfg(target_family = "unix")]
fn update_unix(window: Window, data_dir_path: String, mut settings: Value) {
    use std::{fs::Permissions, os::unix::fs::PermissionsExt};
    let mut message: String = "Updating Bundle...".to_string();
    if settings.get("bundle_version").unwrap().as_str().unwrap() == "" {
        message = "Downloading Bundle...".to_string();
    }
    let response: Result<Response, Error> =
        get("https://github.com/YofaGh/MangaDownloader/releases/expanded_assets/latest");
    match response {
        Ok(content) => {
            let html: String = content.text().unwrap();
            let document: Html = Html::parse_document(&html);
            let selector: Selector = Selector::parse("a").unwrap();
            let href: scraper::ElementRef<'_> = document
                .select(&selector)
                .filter(|el| {
                    el.value()
                        .attr("href")
                        .map(|href| href.contains("sheller-v"))
                        .unwrap_or(false)
                })
                .next()
                .unwrap();
            let mut sheller_name: String = "".to_string();
            for te in href.text().collect::<Vec<_>>() {
                if te.contains("sheller-v") {
                    sheller_name = te.to_string();
                    break;
                }
            }
            let latest_sheller_version: &str = sheller_name.split("-v").collect::<Vec<&str>>()[1]
                .split("-")
                .collect::<Vec<&str>>()[0];
            if latest_sheller_version != settings.get("bundle_version").unwrap().as_str().unwrap() {
                window.emit("updateStatus", Some(message)).unwrap();
                let response: Result<Response, Error> = get(format!(
                    "https://github.com{}",
                    href.attr("href").unwrap().to_string()
                ));
                match response {
                    Ok(resp) => {
                        if resp.status().is_success() {
                            let mut file: File = File::create(format!("{}/sheller", data_dir_path))
                                .expect("Failed to create file");
                            let content = resp.bytes().expect("Failed to read response bytes");
                            file.write_all(&content).expect("Failed to write to file");
                            file.set_permissions(Permissions::from_mode(0o755)).unwrap();
                            *settings.get_mut("bundle_version").unwrap() =
                                json!(latest_sheller_version);
                            write_settings(
                                format!("{}/settings.json", data_dir_path),
                                to_string(&settings).unwrap(),
                            );
                        }
                    }
                    Err(_) => {}
                }
            }
        }
        Err(_) => {}
    }
    window.get_window("splashscreen").unwrap().close().unwrap();
    window.get_window("main").unwrap().show().unwrap();
}