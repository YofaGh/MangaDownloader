use tauri::api::process::{Command, CommandEvent};

#[derive(Clone, serde::Serialize)]
struct SearchingModule {
    module: String,
    keyword: String,
}

#[tauri::command]
pub async fn search_keyword(
    keyword: String,
    depth: String,
    absolute: String,
    modules: Vec<String>,
    window: tauri::Window,
) {
    for module in modules {
        window
            .emit(
                "searchingModule",
                SearchingModule {
                    module: module.clone(),
                    keyword: keyword.clone(),
                },
            )
            .unwrap();
        let (mut rx, _child) = Command::new_sidecar("sheller")
            .expect("failed to create `my-sidecar` binary command")
            .args(&["search", &module, &keyword, "0.1", &absolute, &depth])
            .spawn()
            .expect("Failed to spawn sidecar");
        let cloned_window: tauri::Window = window.clone();
        tauri::async_runtime::spawn(async move {
            while let Some(event) = rx.recv().await {
                if let CommandEvent::Stdout(line) = event {
                    cloned_window
                        .emit("searchedModule", Some(format!("{}", line)))
                        .expect("failed to emit event");
                    break;
                }
            }
        });
    }
    window
        .emit("doneSearching", Some(format!("{}", keyword)))
        .unwrap();
}