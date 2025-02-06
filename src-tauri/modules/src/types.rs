use serde_json::Value;
use std::{collections::HashMap, result::Result as StdResult};

use crate::{errors::Error, models::Module};

pub type BasicHashMap = HashMap<String, String>;
pub type BoxModule = Box<dyn Module>;
pub type ValueHashMap = HashMap<String, Value>;
pub type Result<T, E = Error> = StdResult<T, E>;
