use std::{
    collections::HashMap,
    sync::atomic::{AtomicBool, Ordering},
};
use tauri::Window;
use crate::assets;

static STOP_SEARCH: AtomicBool = AtomicBool::new(false);

#[derive(Clone, serde::Serialize)]
struct SearchingModule {
    module: String,
}

#[derive(Clone, serde::Serialize)]
struct SearchedModule {
    result: Vec<HashMap<String, String>>,
}

#[tauri::command]
pub fn stop_search() {
    STOP_SEARCH.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub async fn search_keyword(
    modules: Vec<String>,
    keyword: String,
    sleep_time: f64,
    depth: u32,
    absolute: bool,
    window: Window,
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
        let result: Vec<HashMap<String, String>> =
            assets::search_by_keyword(module, keyword.clone(), absolute, sleep_time, depth).await;
        window
            .emit("searchedModule", SearchedModule { result })
            .expect("failed to emit event");
    }
    window.emit("doneSearching", ()).expect("msg");
}