use serde::{Deserialize, Serialize};
use std::io::Error as IoError;

#[derive(Debug, Serialize, Deserialize)]
pub enum AppError {
    NoImages(String),
    DirectoryCreation(String),
    DirectoryRemoval(String),
    DirectoryReading(String),
    IoError(String),
}

impl From<IoError> for AppError {
    fn from(err: IoError) -> Self {
        AppError::IoError(err.to_string())
    }
}