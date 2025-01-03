use image::{open, DynamicImage};
use natord::compare;
use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use reqwest::get;
use semver::Version;
use serde::Serialize;
use serde_json::{to_string_pretty, to_value, Value};
use std::{
    ffi::OsStr,
    fs::{create_dir_all, read_dir, remove_dir, remove_dir_all, write, DirEntry, File},
    io::{Error as IoError, Write},
    path::PathBuf,
};
use tauri::{path::BaseDirectory, AppHandle, Emitter, Error as TauriError, Manager, WebviewWindow};
use tokio::time::{sleep, Duration};

use crate::{
    errors::AppError,
    lib_utils::{get_modules_version, load_modules, unload_modules},
};

const GITHUB_URL: &str = "https://raw.githubusercontent.com/YofaGh/MangaDownloader/master/";

#[derive(Serialize)]
struct Settings {
    auto_merge: bool,
    auto_convert: bool,
    load_covers: bool,
    sleep_time: f64,
    default_search_depth: usize,
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

pub fn load_up_checks(data_dir_path: PathBuf) -> Result<(), AppError> {
    save_file(
        &data_dir_path.join("settings.json"),
        to_value(Settings::default())?,
    )?;
    let file_array: [&str; 4] = [
        "library.json",
        "downloaded.json",
        "queue.json",
        "favorites.json",
    ];
    file_array
        .into_iter()
        .try_for_each(|file: &str| -> Result<(), AppError> {
            save_file(&data_dir_path.join(file), Value::Array(Vec::new()))
        })
}

pub fn remove_directory(path: String, recursive: bool) -> Result<(), AppError> {
    if !PathBuf::from(&path).exists() {
        return Ok(());
    }
    if recursive {
        return remove_dir_all(&path)
            .map_err(|err: IoError| AppError::directory("remove", &path, err));
    }
    if read_directory(&path)?.is_empty() {
        return remove_dir(&path).map_err(|err: IoError| AppError::directory("remove", &path, err));
    }
    Ok(())
}

pub fn create_directory(path: &str) -> Result<(), AppError> {
    create_dir_all(&path).map_err(|err: IoError| AppError::directory("create", path, err))
}

pub fn read_directory(path: &str) -> Result<Vec<DirEntry>, AppError> {
    read_dir(path)
        .map_err(|err: IoError| AppError::directory("read", path, err))?
        .into_iter()
        .map(|res: Result<DirEntry, IoError>| {
            res.map_err(|err: IoError| AppError::directory("read", path, err))
        })
        .collect()
}

pub async fn update_checker(app: AppHandle) -> Result<(), AppError> {
    let path: String = append_dynamic_lib_extension("resources/modules");
    let modules_path: PathBuf = app
        .path()
        .resolve(path, BaseDirectory::Resource)
        .map_err(|err: TauriError| AppError::Other(err.to_string()))?;
    load_modules(&modules_path)?;
    let splash_screen_window: WebviewWindow = app
        .get_webview_window("splashscreen")
        .ok_or_else(|| AppError::window("get window", "splashscreen", String::new()))?;
    emit_status(&splash_screen_window, "Checking for updates")?;
    let current_version: Version = Version::parse(&get_modules_version())?;
    let mut unloaded_modules: bool = false;
    match get(format!("{GITHUB_URL}modules-version.txt")).await {
        Ok(response) => {
            let latest_version: Version = Version::parse(response.text().await?.trim())?;
            if latest_version > current_version {
                emit_status(&splash_screen_window, "Updating Modules")?;
                unload_modules()?;
                unloaded_modules = true;
                let path: String = append_dynamic_lib_extension(&format!(
                    "{GITHUB_URL}src-tauri/resources/modules"
                ));
                match get(path).await {
                    Ok(response) => write(&modules_path, response.bytes().await?.to_vec())
                        .map_err(|err: IoError| AppError::file("write to", &modules_path, err))?,
                    Err(_) => {
                        emit_status(&splash_screen_window, "Failed to update modules")?;
                        sleep(Duration::from_secs(1)).await;
                    }
                }
            }
        }
        Err(_) => {
            emit_status(&splash_screen_window, "Failed to check for updates")?;
            sleep(Duration::from_secs(1)).await;
        }
    }
    if unloaded_modules {
        load_modules(&modules_path)?;
    }
    splash_screen_window
        .close()
        .map_err(|err: TauriError| AppError::window("close", "splashscreen: ", err.to_string()))?;
    app.get_webview_window("main")
        .ok_or_else(|| AppError::window("get window", "main", String::new()))?
        .show()
        .map_err(|err: TauriError| AppError::window("show", "main: ", err.to_string()))
}

fn save_file(path: &PathBuf, data: Value) -> Result<(), AppError> {
    if path.exists() {
        return Ok(());
    }
    let mut file: File = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|err: IoError| AppError::file("open", &path, err))?;
    file.write_all(to_string_pretty(&data)?.as_bytes())
        .map_err(|err: IoError| AppError::file("write to", &path, err))?;
    file.flush()
        .map_err(|err: IoError| AppError::file("flush", &path, err))
}

fn emit_status(window: &WebviewWindow, message: &str) -> Result<(), AppError> {
    window
        .emit("updateStatus", message)
        .map_err(|err: TauriError| {
            AppError::window(
                &format!("emit message: {message}"),
                window.label(),
                err.to_string(),
            )
        })
}

pub fn detect_images(path_to_source: &str) -> Result<Vec<(DynamicImage, PathBuf)>, AppError> {
    let mut dirs: Vec<PathBuf> = read_directory(path_to_source)?
        .into_iter()
        .filter_map(|entry: DirEntry| {
            let path: PathBuf = entry.path();
            match path.extension().and_then(|ext: &OsStr| ext.to_str()) {
                Some("jpg") | Some("png") | Some("jpeg") | Some("gif") | Some("webp") => Some(path),
                _ => None,
            }
        })
        .collect();
    dirs.sort_by(|a: &PathBuf, b: &PathBuf| {
        compare(a.to_str().unwrap_or(""), b.to_str().unwrap_or(""))
    });
    dirs.into_par_iter()
        .filter_map(|path: PathBuf| open(&path).ok().map(|img: DynamicImage| Ok((img, path))))
        .collect()
}

fn append_dynamic_lib_extension(path: &str) -> String {
    if cfg!(target_family = "windows") {
        format!("{path}.dll")
    } else {
        format!("{path}.so")
    }
}
