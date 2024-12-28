use image::{open, DynamicImage};
use natord::compare;
use rayon::prelude::{IntoParallelIterator, ParallelIterator};
use reqwest::get;
use semver::Version;
use serde::Serialize;
use serde_json::{to_string_pretty, to_value, Value};
use std::{
    ffi::OsStr,
    fs::{read_dir, write, DirEntry, File, OpenOptions},
    io::{Error as IoError, Write},
    path::PathBuf,
};
use tauri::{Emitter, Error as TauriError, WebviewWindow};
use tokio::time::{sleep, Duration};

use crate::{
    errors::AppError,
    lib_utils::{get_modules_version, unload_modules},
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
    let default_settings: Settings = Settings::default();
    save_file(
        &data_dir_path.join("settings.json"),
        to_value(&default_settings)?,
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

pub async fn check_and_update_modules(
    window: &WebviewWindow,
    modules_path: &PathBuf,
) -> Result<bool, AppError> {
    emit_status(&window, "Checking for updates")?;
    let current_version: Version = Version::parse(&get_modules_version())?;
    let mut unloaded_modules: bool = false;
    match get(format!("{GITHUB_URL}modules-version.txt")).await {
        Ok(response) => {
            let latest_version: Version = Version::parse(response.text().await?.trim())?;
            if latest_version > current_version {
                emit_status(&window, "Updating Modules")?;
                unload_modules()?;
                unloaded_modules = true;
                let path: String = append_dynamic_lib_extension(&format!(
                    "{GITHUB_URL}src-tauri/resources/modules"
                ));
                match get(path).await {
                    Ok(response) => write(&modules_path, response.bytes().await?.to_vec())
                        .map_err(|err: IoError| AppError::file("write to", modules_path, err))?,
                    Err(_) => {
                        emit_status(&window, "Failed to update modules")?;
                        sleep(Duration::from_secs(1)).await;
                    }
                }
            }
        }
        Err(_) => {
            emit_status(&window, "Failed to check for updates")?;
            sleep(Duration::from_secs(1)).await;
        }
    }
    Ok(unloaded_modules)
}

fn save_file(path: &PathBuf, data: Value) -> Result<(), AppError> {
    if path.exists() {
        return Ok(());
    }
    let mut file: File = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map_err(|err: IoError| AppError::file("open", &path, err))?;
    file.write_all(to_string_pretty(&data)?.as_bytes())
        .and_then(|_| file.flush())
        .map_err(|err: IoError| AppError::file("write to", &path, err))
}

fn emit_status(window: &WebviewWindow, message: &str) -> Result<(), AppError> {
    window
        .emit("updateStatus", message)
        .map_err(|err: TauriError| {
            AppError::Other(format!(
                "Failed to emit message: {message} to window: {err}"
            ))
        })
}

pub fn detect_images(path_to_source: &str) -> Result<Vec<(DynamicImage, PathBuf)>, AppError> {
    let mut dirs: Vec<PathBuf> = read_dir(path_to_source)
        .map_err(|err: IoError| AppError::directory("read", path_to_source, err))?
        .filter_map(Result::ok)
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

pub fn append_dynamic_lib_extension(path: &str) -> String {
    if cfg!(target_family = "windows") {
        format!("{path}.dll")
    } else {
        format!("{path}.so")
    }
}
