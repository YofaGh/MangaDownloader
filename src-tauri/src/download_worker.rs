use serde_json::{from_str, Value};
use std::collections::HashMap;
use std::fs::{create_dir_all, read_dir};
use std::io::{self, Write};
use std::sync::atomic::{AtomicBool, Ordering};
use std::{thread, time::Duration};
#[path = "sheller.rs"] mod sheller;

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
    pre_shell: String,
    window: tauri::Window,
) {
    STOP_DOWNLOAD.store(false, Ordering::Relaxed);
    let mut args: Vec<String> = vec![];
    let mut folder_name: String = fixed_title.clone();
    if webtoon.get("type").unwrap() == "manga" {
        args.push("get_manga_images".to_string());
        args.push(webtoon.get("module").unwrap().to_string());
        args.push(webtoon.get("manga").unwrap().to_string());
        args.push(webtoon.get("chapter").unwrap().to_string());
        folder_name.push_str(&("\\".to_string() + &webtoon.get("info").unwrap()));
    } else {
        args.push("get_doujin_images".to_string());
        args.push(webtoon.get("module").unwrap().to_string());
        args.push(webtoon.get("doujin").unwrap().to_string());
    }
    let response: String = sheller::call_sheller_win(pre_shell.clone(), args).await;
    let json_data: Value = from_str(&response).expect("Failed to parse JSON");
    let images: &Vec<Value> = json_data
        .as_array()
        .unwrap()
        .get(0)
        .unwrap()
        .as_array()
        .unwrap();
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
    let dirs: std::fs::ReadDir = read_dir(&d_path).unwrap();
    let mut exists_images: Vec<String> = Vec::new();
    for dir in dirs {
        exists_images.push(dir.unwrap().path().to_str().unwrap().to_string());
    }
    let mut last_truncated: String = "".to_string();
    let mut has_saved_names: bool = false;
    let mut saved_names: Vec<String> = Vec::new();
    if let Some(obj) = json_data
        .as_array()
        .unwrap()
        .get(1)
        .and_then(|v: &Value| v.as_array())
    {
        has_saved_names = true;
        saved_names.extend(obj.iter().map(|v: &Value| v.as_str().unwrap().to_string()));
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
                .unwrap()
                .split(".")
                .last()
                .unwrap();
            save_path.push_str(format!("{}\\{}.{}", d_path, padded_string, temp_s).as_str());
        }
        if !exists_images.contains(&save_path) {
            let d_response: String = sheller::call_sheller_win(
                pre_shell.clone(),
                vec![
                    "download_image".to_string(),
                    webtoon.get("module").unwrap().to_string(),
                    images[i as usize].as_str().unwrap().to_string(),
                    save_path.to_string(),
                ],
            )
            .await;
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
                let val_corrupted_image: String = sheller::call_sheller_win(
                    pre_shell.clone(),
                    vec![
                        "validate_corrupted_image".to_string(),
                        d_response.trim().replace("\"", "").replace("\\\\", "\\"),
                    ],
                )
                .await;
                if val_corrupted_image == "false" {
                    window
                        .emit(
                            "corruptedImage",
                            Downloading {
                                webtoon_id: webtoon.get("id").unwrap().to_string(),
                                image: (i + 1) as i32,
                            },
                        )
                        .expect("failed to emit event");
                }
                let val_truncated_image: String = sheller::call_sheller_win(
                    pre_shell.clone(),
                    vec![
                        "validate_truncated_image".to_string(),
                        d_response.trim().replace("\"", "").replace("\\\\", "\\"),
                    ],
                )
                .await;
                if val_corrupted_image == "true"
                    && val_truncated_image == "false"
                    && last_truncated != d_response
                {
                    last_truncated = d_response;
                    window
                        .emit(
                            "truncatedImage",
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