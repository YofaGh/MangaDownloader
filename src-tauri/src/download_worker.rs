use std::collections::HashMap;
use std::fs::{create_dir_all, read_dir};
use std::io::{self, Write};
use std::{thread, time::Duration};
use tauri::api::process::CommandEvent;
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
pub async fn download(webtoon: HashMap<String, String>, download_path: String, window: tauri::Window) {
    let response: String = String::new();
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
    let mut cloned_response: String = response.clone();
    let (mut rx, _child) = tauri::api::process::Command::new_sidecar("sheller")
        .expect("failed to create `my-sidecar` binary command")
        .args(&args)
        .spawn()
        .expect("Failed to spawn sidecar");
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
                cloned_response.push_str(&line);
                break;
            }
        }
        let json_data: serde_json::Value =
            serde_json::from_str(&cloned_response).expect("Failed to parse JSON");
        let re = json_data.as_array().unwrap();
        let images = re.get(0).unwrap().as_array().unwrap();
        let d_path: String = format!(
            "{}\\{}",
            download_path,
            folder_name
        );
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
        // let last_truncated: Option<String> = None;
        let mut has_saved_names: bool = false;
        let mut saved_names: Vec<String> = Vec::new();
        if let Some(obj) = re.get(1).and_then(|v| v.as_array()) {
            has_saved_names = true;
            saved_names.extend(obj.iter().map(|v| v.as_str().unwrap().to_string()));
        }
        let mut i: i32 = 0;
        while i < images.len() as i32 {
            let mut save_path: String = "".to_string();
            if has_saved_names {
                save_path.push_str(format!("{}\\{}", d_path, saved_names.get(i as usize).unwrap()).as_str());
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
            let d_response: String = String::new();
            let mut d_cloned_response: String = d_response.clone();
            if !exists_images.contains(&save_path) {
                let (mut rx, _child) = tauri::api::process::Command::new_sidecar("sheller")
                    .expect("failed to create `my-sidecar` binary command")
                    .args(&[
                        "download_image",
                        &webtoon.get("module").unwrap(),
                        images.get(i as usize).unwrap().as_str().unwrap(),
                        &save_path,
                    ])
                    .spawn()
                    .expect("Failed to spawn sidecar");
                tauri::async_runtime::spawn(async move {
                    while let Some(event) = rx.recv().await {
                        if let CommandEvent::Stdout(line) = event {
                            d_cloned_response.push_str(&line);
                            break;
                        }
                    }
                    io::stdout().flush().expect("Unable to flush stdout");
                });
            }
            thread::sleep(Duration::from_millis(1000));
            window
                .emit(
                    "downloading",
                    Downloading {
                        webtoon_id: webtoon.get("id").unwrap().to_string(),
                        image: (i + 1) as i32,
                    },
                )
                .expect("failed to emit event");
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
    });
}