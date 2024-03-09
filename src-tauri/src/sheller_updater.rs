use reqwest::{
    blocking::{get, Response},
    Error,
};
use std::env::consts::FAMILY;
use std::io::prelude::{Read, Write};
use std::path::PathBuf;
use std::{
    fs::{read, remove_file, File},
    io::Cursor,
};

pub fn update_sheller(data_dir_path: String) {
    if FAMILY == "windows" {
        update_win(data_dir_path.clone());
    }
}

fn update_win(data_dir_path: String) {
    let url: &str = "https://github.com/YofaGh/MangaDownloader/raw/master/cli/sheller.py";
    let response: Result<Response, Error> = get(url);
    match response {
        Ok(mut content) => {
            let mut file: File =
                File::create(format!("{}/cli.py", data_dir_path)).expect("Failed to create file");
            let mut content_string: String = String::new();
            content
                .read_to_string(&mut content_string)
                .expect("Failed to read content");
            file.write_all(content_string.as_bytes())
                .expect("Failed to write to file");
        }
        Err(_) => {}
    }
    let url: &str = "https://github.com/YofaGh/MangaScraper/archive/refs/heads/master.zip";
    let response: Result<Response, Error> = get(url);
    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                let mut file: File = File::create(format!("{}/cli.zip", data_dir_path))
                    .expect("Failed to create file");
                let content = resp.bytes().expect("Failed to read response bytes");
                file.write_all(&content).expect("Failed to write to file");
            }
            let archive: Vec<u8> = read(format!("{}/cli.zip", data_dir_path)).unwrap();
            let target_dir: PathBuf = PathBuf::from(format!("{}/mangascraper", data_dir_path));
            let _ = zip_extract::extract(Cursor::new(archive), &target_dir, true);
            remove_file(format!("{}/cli.zip", data_dir_path)).expect("msg");
        }
        Err(_) => {}
    }
}