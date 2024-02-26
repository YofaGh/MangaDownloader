use serde_json::{from_str, Value};
use std::collections::HashMap;
use std::fs::{create_dir_all, read_dir};
use std::io::{self, Write};
use std::{thread, time::Duration};
use tauri::regex::Regex;

fn fix_name_for_folder(manga: &str) -> String {
    let replaced_slash = Regex::new(r#"[\/:*?"><|]+"#)
        .unwrap()
        .replace_all(manga, "");
    let final_name = Regex::new(r#"\.*$"#)
        .unwrap()
        .replace_all(&replaced_slash, "");
    final_name.to_string()
}

async fn call_sheller(args: Vec<String>) -> String {
    let (mut rx, _child) = tauri::api::process::Command::new_sidecar("sheller")
        .expect("failed to create `my-sidecar` binary command")
        .args(&args)
        .spawn()
        .expect("Failed to spawn sidecar");
    let mut response: String = String::new();
    while let Some(event) = rx.recv().await {
        if let tauri::api::process::CommandEvent::Stdout(line) = event {
            response.push_str(&line);
            break;
        }
    }
    response
}

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
pub async fn download(
    webtoon: HashMap<String, String>,
    download_path: String,
    window: tauri::Window,
) {
    let mut args: Vec<String> = Vec::new();
    let mut folder_name: String = fix_name_for_folder(&webtoon.get("title").unwrap());
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
    let response: String = call_sheller(args).await;
    let json_data: Value = from_str(&response).expect("Failed to parse JSON");
    let images: &Vec<Value> = json_data.as_array().unwrap().get(0).unwrap().as_array().unwrap();
    let d_path: String = format!("{}\\{}", download_path, folder_name);
    create_dir_all(d_path.clone()).expect("Failed to create dir");
    window
        .emit(
            "totalImages",
            TotalImages {
                webtoon_id: webtoon.get("id").unwrap().to_string(),
                total_images: images.len() as i32,
            },
        )
        .expect("failed to emit event");
    let dirs: std::fs::ReadDir = read_dir(d_path.clone()).unwrap();
    let mut exists_images: Vec<String> = Vec::new();
    for dir in dirs {
        exists_images.push(dir.unwrap().path().to_str().unwrap().to_string());
    }
    let mut last_truncated: String = "".to_string();
    let mut has_saved_names: bool = false;
    let mut saved_names: Vec<String> = Vec::new();
    if let Some(obj) = json_data.as_array().unwrap().get(1).and_then(|v| v.as_array()) {
        has_saved_names = true;
        saved_names.extend(obj.iter().map(|v| v.as_str().unwrap().to_string()));
    }
    let mut i: i32 = 0;
    while i < images.len() as i32 {
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
            let d_response: String = call_sheller(vec![
                "download_image".to_string(),
                webtoon.get("module").unwrap().to_string(),
                images[i as usize].as_str().unwrap().to_string(),
                save_path.to_string(),
            ])
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
                let val_corrupted_image: String = call_sheller(vec![
                    "validate_corrupted_image".to_string(),
                    d_response.trim().replace("\"", "").replace("\\\\", "\\"),
                ])
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
                let val_truncated_image: String = call_sheller(vec![
                    "validate_truncated_image".to_string(),
                    d_response.trim().replace("\"", "").replace("\\\\", "\\"),
                ])
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
            thread::sleep(Duration::from_millis(1000));
        }
        i += 1;
    }
    window
        .emit(
            "done",
            DoneDownloading {
                webtoon_id: webtoon.get("id").unwrap().to_string(),
                download_path: d_path,
            },
        )
        .expect("failed to emit event");
    io::stdout().flush().expect("Unable to flush stdout");
}
