use tauri::api::process::{Command, CommandEvent};

#[allow(dead_code)]
pub async fn call_sheller(pre_shell: String, args: Vec<String>) -> String {
    if std::env::consts::FAMILY == "windows" {
        return call_sheller_win(pre_shell, args).await
    } else {
        return "".to_string();
    }
}

pub async fn call_sheller_win(pre_shell: String, mut args: Vec<String>) -> String {
    args.insert(0, format!("{}\\sheller.py", pre_shell));
    let (mut rx, _child) =
        Command::new(format!("{}\\python\\python.exe", pre_shell))
            .current_dir(pre_shell.into())
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