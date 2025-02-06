use image::DynamicImage;
use serde_json::Value;
use std::{collections::HashMap, path::PathBuf, result::Result as StdResult};

use crate::errors::Error;

pub type BasicHashMap = HashMap<String, String>;
pub type DownloadImageFn = fn(String, String, String) -> Result<Option<String>>;
pub type GetChaptersFn = fn(String, String) -> Result<Vec<BasicHashMap>>;
pub type GetChapterUrlFn = fn(String, String, String) -> Result<String>;
pub type GetImagesFn = fn(String, String, String) -> Result<(Vec<String>, Value)>;
pub type GetInfoFn = fn(String, String) -> Result<ValueHashMap>;
pub type GetModulesFn = fn() -> Result<Vec<ValueHashMap>>;
pub type GetModuleSampleFn = fn(String) -> Result<BasicHashMap>;
pub type GetVersionFn = fn() -> Result<String>;
pub type GetWebtoonUrlFn = fn(String, String) -> Result<String>;
pub type ImageVec = Vec<(DynamicImage, PathBuf)>;
pub type Result<T, E = Error> = StdResult<T, E>;
pub type RetrieveImageFn = fn(String, String) -> Result<String>;
pub type SearchByKeywordFn = fn(String, String, bool, f64, u32) -> Result<Vec<BasicHashMap>>;
pub type ValueHashMap = HashMap<String, Value>;
