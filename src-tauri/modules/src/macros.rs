#[macro_export]
macro_rules! insert {
    ($hashmap:expr, $key:expr, $value:expr) => {
        to_value($value)
            .ok()
            .and_then(|value: Value| $hashmap.insert($key.to_owned(), value))
    };
}

#[macro_export]
macro_rules! search_map {
    ($title:expr, $domain:expr, $key:expr, $value:expr, $page:expr) => {{
        let mut map: HashMap<String, String> = HashMap::new();
        map.insert("name".to_owned(), $title.to_string());
        map.insert("domain".to_owned(), $domain.to_owned());
        map.insert($key.to_owned(), $value.to_string());
        map.insert("page".to_owned(), $page.to_string());
        map
    }};
}
