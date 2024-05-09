use serde_json::{from_value, Value};
use std::collections::HashMap;
use std::fs::{create_dir_all, read_dir, ReadDir};
use std::io::{self, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::{thread, time::Duration};
use tauri::Window;
use crate::assets;

static STOP_DOWNLOAD: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
struct DoneDownloading {
    webtoon_id: String,
    download_path: String,
}

#[derive(Clone, serde::Serialize)]
struct TotalImages {
    webtoon_id: String,
    total_images: i32,
}

#[derive(Clone, serde::Serialize)]
struct Downloading {
    webtoon_id: String,
    image: i32,
}

#[tauri::command]
pub fn stop_download() {
    STOP_DOWNLOAD.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub async fn download(
    webtoon: HashMap<String, String>,
    fixed_title: String,
    sleep_time: f64,
    download_path: String,
    window: Window,
) {
    STOP_DOWNLOAD.store(false, Ordering::Relaxed);
    let mut folder_name: String = fixed_title.clone();
    let images: Vec<String>;
    let saved_n: Value;
    if webtoon.get("type").unwrap() == "manga" {
        (images, saved_n) = assets::get_images(
            webtoon.get("module").unwrap(),
            webtoon.get("manga").unwrap(),
            webtoon.get("chapter").unwrap(),
        )
        .await;
        folder_name.push_str(&("\\".to_string() + &webtoon.get("info").unwrap()));
    } else {
        (images, saved_n) = assets::get_images(
            webtoon.get("module").unwrap(),
            webtoon.get("manga").unwrap(),
            "",
        )
        .await;
    }
    let d_path: String = format!("{}\\{}", download_path, folder_name);
    create_dir_all(&d_path).expect("Failed to create dir");
    window
        .emit(
            "totalImages",
            TotalImages {
                webtoon_id: webtoon.get("id").unwrap().to_string(),
                total_images: images.len() as i32,
            },
        )
        .expect("failed to emit event");
    let dirs: ReadDir = read_dir(&d_path).unwrap();
    let mut exists_images: Vec<String> = Vec::new();
    for dir in dirs {
        exists_images.push(dir.unwrap().path().to_str().unwrap().to_string());
    }
    let mut last_corrupted: String = "".to_string();
    let mut has_saved_names: bool = false;
    let mut saved_names: Vec<String> = Vec::new();
    if saved_n.is_array() {
        has_saved_names = true;
        saved_names = from_value(saved_n).unwrap();
    }
    let mut i: i32 = 0;
    while i < images.len() as i32 {
        if STOP_DOWNLOAD.load(Ordering::Relaxed) {
            return;
        }
        window
            .emit(
                "downloading",
                Downloading {
                    webtoon_id: webtoon.get("id").unwrap().to_string(),
                    image: (i + 1) as i32,
                },
            )
            .expect("failed to emit event");
        let mut save_path: String = "".to_string();
        if has_saved_names {
            save_path
                .push_str(format!("{}\\{}", d_path, saved_names.get(i as usize).unwrap()).as_str());
        } else {
            let padded_string: String = format!("{:0>width$}", (i + 1).to_string(), width = 3);
            let temp_s: &str = images
                .get(i as usize)
                .unwrap()
                .as_str()
                .split(".")
                .last()
                .unwrap();
            save_path.push_str(format!("{}\\{}.{}", d_path, padded_string, temp_s).as_str());
        }
        if !exists_images.contains(&save_path) {
            let d_response: String = assets::download_image(
                webtoon.get("module").unwrap(),
                images[i as usize].as_str(),
                &save_path,
            )
            .await
            .unwrap();
            if d_response.is_empty() {
                window
                    .emit(
                        "downloadFailed",
                        Downloading {
                            webtoon_id: webtoon.get("id").unwrap().to_string(),
                            image: (i + 1) as i32,
                        },
                    )
                    .expect("failed to emit event");
            } else {
                let is_image_valid: bool =
                    assets::validate_image(&d_response.trim().replace("\"", "").replace("\\\\", "\\"));
                if !is_image_valid && last_corrupted != d_response {
                    last_corrupted = d_response;
                    window
                        .emit(
                            "corruptedImage",
                            Downloading {
                                webtoon_id: webtoon.get("id").unwrap().to_string(),
                                image: (i + 1) as i32,
                            },
                        )
                        .expect("failed to emit event");
                    continue;
                }
            }
            thread::sleep(Duration::from_millis((sleep_time * 1000.0) as u64));
        }
        i += 1;
    }
    window
        .emit(
            "doneDownloading",
            DoneDownloading {
                webtoon_id: webtoon.get("id").unwrap().to_string(),
                download_path: d_path,
            },
        )
        .expect("failed to emit event");
    io::stdout().flush().expect("Unable to flush stdout");
}