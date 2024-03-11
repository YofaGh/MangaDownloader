use std::env::consts::FAMILY;
use tauri::api::process::{Command, CommandEvent};

#[allow(dead_code)]
pub async fn call_sheller(data_dir_path: String, args: Vec<String>) -> String {
    if FAMILY == "windows" {
        return call_sheller_win(data_dir_path, args).await;
    }
    return call_sheller_unix(args).await;
}

pub async fn call_sheller_win(data_dir_path: String, mut args: Vec<String>) -> String {
    args.insert(0, format!("{}\\sheller.py", data_dir_path));
    let (mut rx, _child) = Command::new(format!("{}\\python\\python.exe", data_dir_path))
        .current_dir(data_dir_path.into())
        .args(args)
        .spawn()
        .expect("Failed to spawn sidecar");
    let mut response: String = String::new();
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(line) = event {
            response.push_str(&line);
            break;
        }
    }
    response
}

pub async fn call_sheller_unix(args: Vec<String>) -> String {
    let (mut rx, _child) = Command::new_sidecar("sheller")
        .expect("failed to create `my-sidecar` binary command")
        .args(&args)
        .spawn()
        .expect("Failed to spawn sidecar");
    let mut response: String = String::new();
    while let Some(event) = rx.recv().await {
        if let CommandEvent::Stdout(line) = event {
            response.push_str(&line);
            break;
        }
    }
    response
}