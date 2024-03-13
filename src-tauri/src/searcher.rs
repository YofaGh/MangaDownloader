use std::{
    path::PathBuf,
    sync::atomic::{AtomicBool, Ordering},
};
use tauri::{Manager, Window};
#[path = "sheller.rs"]
mod sheller;

static STOP_SEARCH: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
struct SearchingModule {
    module: String,
}

#[derive(Clone, serde::Serialize)]
struct SearchedModule {
    result: String,
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
    window: Window,
) {
    STOP_SEARCH.store(false, Ordering::Relaxed);
    let data_dir_path: String = window
        .app_handle()
        .path_resolver()
        .app_data_dir()
        .unwrap_or(PathBuf::new())
        .to_string_lossy()
        .to_string();
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
        let result: String = sheller::call_sheller(
            data_dir_path.clone(),
            vec![
                "search".to_string(),
                module,
                keyword.clone(),
                sleep_time.clone(),
                absolute.clone(),
                depth.clone(),
            ],
        )
        .await;
        window
            .emit("searchedModule", SearchedModule { result })
            .expect("failed to emit event");
    }
    window.emit("doneSearching", ()).expect("msg");
}