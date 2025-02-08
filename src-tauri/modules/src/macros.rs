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
        HashMap::from([
            ("name".to_owned(), $title.to_string()),
            ("domain".to_owned(), $domain.to_owned()),
            ($key.to_owned(), $value.to_string()),
            ("page".to_owned(), $page.to_string()),
        ])
    }};
}

#[macro_export]
macro_rules! create_module_registry {
    ($(($domain:expr, $module:ty)),* $(,)?) => {
        static MODULE_REGISTRY: LazyLock<HashMap<&str, fn() -> BoxModule>> = LazyLock::new(|| {
            let mut m = HashMap::<&str, fn() -> BoxModule>::new();
            $(
                m.insert($domain, || <$module>::new().into());
            )*
            m
        });
    };
}
