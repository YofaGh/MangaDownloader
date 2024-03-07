use std::sync::atomic::{AtomicBool, Ordering};
#[path = "sheller.rs"] mod sheller;

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
    pre_shell: String,
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
        let result: String = sheller::call_sheller_win(
            pre_shell.clone(),
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