use reqwest::Error as ReqwestError;
use semver::Error as SemverError;
use serde::{Deserialize, Serialize};
use serde_json::Error as SerdeJsonError;
use std::{
    fmt::{Display, Formatter, Result as FmtResult},
    io::Error as IoError,
    path::Path,
};

#[derive(Debug, Serialize, Deserialize)]
pub enum Error {
    DirectoryOperation(String),
    FileOperation(String),
    ImageError(String),
    LibraryError(String),
    Other(String),
    ParserError(String),
    PdfError(String),
    ReqwestError(String),
    RuntimeError(String),
    SemverError(String),
    SerdeJsonError(String),
    TauriError(String),
}

impl Error {
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
    pub fn window(action: &str, name: &str, err: String) -> Self {
        Self::TauriError(format!("Failed to {action} {name}{err}"))
    }
}

impl Display for Error {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        let (error_type, msg) = match self {
            Error::DirectoryOperation(msg) => ("Directory operation error", msg),
            Error::FileOperation(msg) => ("File operation error", msg),
            Error::ImageError(msg) => ("Image error", msg),
            Error::LibraryError(msg) => ("Library error", msg),
            Error::Other(msg) => ("Other error", msg),
            Error::ParserError(msg) => ("Parser error", msg),
            Error::PdfError(msg) => ("PDF error", msg),
            Error::ReqwestError(msg) => ("Reqwest error", msg),
            Error::RuntimeError(msg) => ("Runtime error", msg),
            Error::SemverError(msg) => ("Semver error", msg),
            Error::SerdeJsonError(msg) => ("Serde JSON error", msg),
            Error::TauriError(msg) => ("Tauri error", msg),
        };
        write!(f, "{error_type}: {msg}")
    }
}

impl From<ReqwestError> for Error {
    fn from(err: ReqwestError) -> Self {
        Error::ReqwestError(err.to_string())
    }
}

impl From<SemverError> for Error {
    fn from(err: SemverError) -> Self {
        Error::SemverError(err.to_string())
    }
}

impl From<SerdeJsonError> for Error {
    fn from(err: SerdeJsonError) -> Self {
        Error::SerdeJsonError(err.to_string())
    }
}
