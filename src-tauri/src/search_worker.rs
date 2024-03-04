use std::sync::atomic::{AtomicBool, Ordering};

static STOP_SEARCH: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
struct SearchingModule {
    module: String,
}

#[derive(Clone, serde::Serialize)]
struct SearchedModule {
    result: String,
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

#[tauri::command]
pub fn stop_search() {
    STOP_SEARCH.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub async fn search_keyword(
    modules: Vec<String>,
    keyword: String,
    sleep_time: String,
    depth: String,
    absolute: String,
    window: tauri::Window,
) {
    STOP_SEARCH.store(false, Ordering::Relaxed);
    for module in modules {
        if STOP_SEARCH.load(Ordering::Relaxed) {
            return;
        }
        window
            .emit(
                "searchingModule",
                SearchingModule {
                    module: module.clone(),
                },
            )
            .expect("msg");
        let result: String = call_sheller(vec![
            "search".to_string(),
            module,
            keyword.clone(),
            sleep_time.clone(),
            absolute.clone(),
            depth.clone(),
        ])
        .await;
        window
            .emit("searchedModule", SearchedModule { result })
            .expect("failed to emit event");
    }
    window
        .emit("doneSearching", ())
        .expect("msg");
}