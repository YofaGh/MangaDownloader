#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use::std::process::Command;
use tauri::Manager;

#[tauri::command]
fn open_folder(path: String) {
  Command::new("explorer")
    .args(["/select,", &path])
    .spawn()
    .unwrap();
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![open_folder])
    .setup(|app| {
      #[cfg(debug_assertions)]
      app.get_window("main").unwrap().open_devtools();
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}