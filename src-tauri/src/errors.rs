use reqwest::Error as ReqwestError;
use semver::Error as SemverError;
use serde::{Deserialize, Serialize};
use serde_json::Error as SerdeJsonError;
use std::{
    error::Error as StdError,
    fmt::{Display, Formatter, Result as FmtResult},
    io::Error as IoError,
    path::Path,
};

#[derive(Debug, Serialize, Deserialize)]
pub enum AppError {
    DirectoryOperation(String),
    FileOperation(String),
    ImageError(String),
    LibraryError(String),
    Other(String),
    ParserError(String),
    PdfError(String),
    ReqwestError(String),
    SemverError(String),
    SerdeJsonError(String),
}

impl AppError {
    pub fn directory(action: &str, path: &str, err: IoError) -> Self {
        Self::DirectoryOperation(format!("Failed to {action} the directory {path}: {err}"))
    }
    pub fn file(action: &str, path: impl AsRef<Path>, err: IoError) -> Self {
        Self::FileOperation(format!(
            "Failed to {action} the file {}: {err}",
            path.as_ref().to_string_lossy().to_string()
        ))
    }
    pub fn library(err: String) -> Self {
        Self::LibraryError(format!("Library error, {err}"))
    }
    pub fn lock_library(err: String) -> Self {
        Self::library(format!("Failed to get a lock on guard: {err}"))
    }
    pub fn no_images(path: &str) -> Self {
        Self::Other(format!("No images found in {path}"))
    }
    pub fn parser(url: &str, attr: &str) -> Self {
        Self::ParserError(format!("Failed to parse html {url}: {attr}"))
    }
    pub fn save_image(name: String, err: String) -> Self {
        Self::ImageError(format!("Failed to save merged image {name}.jpg: {err}"))
    }
}

impl StdError for AppError {}

impl Display for AppError {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            AppError::DirectoryOperation(msg)
            | AppError::FileOperation(msg)
            | AppError::ImageError(msg)
            | AppError::LibraryError(msg)
            | AppError::Other(msg)
            | AppError::ParserError(msg)
            | AppError::PdfError(msg)
            | AppError::ReqwestError(msg)
            | AppError::SemverError(msg)
            | AppError::SerdeJsonError(msg) => write!(f, "{msg}"),
        }
    }
}

impl From<ReqwestError> for AppError {
    fn from(err: ReqwestError) -> Self {
        AppError::ReqwestError(err.to_string())
    }
}

impl From<SemverError> for AppError {
    fn from(err: SemverError) -> Self {
        AppError::SemverError(err.to_string())
    }
}

impl From<SerdeJsonError> for AppError {
    fn from(err: SerdeJsonError) -> Self {
        AppError::SerdeJsonError(err.to_string())
    }
}
