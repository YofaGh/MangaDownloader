use async_trait::async_trait;
use reqwest::Response;
use serde_json::Value;
use std::collections::HashMap;

#[async_trait]
pub trait Module: Send {
    fn get_type(&self) -> String;
    fn get_domain(&self) -> String;
    fn get_logo(&self) -> String {
        String::default()
    }
    fn get_download_image_headers(&self) -> HashMap<&'static str, &'static str> {
        HashMap::new()
    }
    fn is_searchable(&self) -> bool {
        false
    }
    fn is_coded(&self) -> bool {
        false
    }
    async fn download_image(&self, url: &str, image_name: &str) -> Option<String>;
    async fn retrieve_image(&self, url: &str) -> Response;
    fn get_module_sample(&self) -> HashMap<String, String>;
    async fn get_images(&self, manga: &str, chapter: &str) -> (Vec<String>, Value);
    async fn get_info(&self, manga: &str) -> HashMap<String, Value>;
    async fn get_chapters(&self, manga: &str) -> Vec<HashMap<String, String>>;
    async fn search_by_keyword(
        &self,
        keyword: String,
        absolute: bool,
        sleep_time: f64,
        page_limit: u32,
    ) -> Vec<HashMap<String, String>>;
    fn rename_chapter(&self, chapter: &str) -> String {
        let mut new_name: String = String::new();
        let mut reached_number: bool = false;
        for ch in chapter.chars() {
            if ch.is_digit(10) {
                new_name.push(ch);
                reached_number = true;
            } else if (ch == '-' || ch == '.')
                && reached_number
                && new_name.chars().last().unwrap_or(' ') != '.'
            {
                new_name.push('.');
            }
        }
        if !reached_number {
            return chapter.to_string();
        }
        new_name = new_name.trim_end_matches('.').to_string();
        match new_name.parse::<i32>() {
            Ok(num) => format!("Chapter {:03}", num),
            Err(_) => {
                let parts: Vec<&str> = new_name.split('.').collect();
                format!(
                    "Chapter {:03}.{}",
                    parts[0].parse::<i32>().unwrap(),
                    parts[1]
                )
            }
        }
    }
}