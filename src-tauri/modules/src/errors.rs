use reqwest::Error as ReqwestError;
use serde_json::Error as SerdeJsonError;
use std::{
    fmt::{Display, Formatter, Result as FmtResult},
    io::Error as IoError,
    path::Path,
};

#[derive(Debug)]
pub enum AppError {
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

impl AppError {
    pub fn file(action: &str, path: impl AsRef<Path>, err: IoError) -> Self {
        Self::FileOperation(format!(
            "Failed to {action} the file {}: {err}",
            path.as_ref().to_string_lossy().to_string()
        ))
    }
    pub fn parser(url: &str, attr: &str) -> Self {
        Self::ParserError(format!("Failed to parse html {url}: {attr}"))
    }
    pub fn runtime(err: IoError) -> Self {
        Self::RuntimeError(format!("Runtime error: Failed to execute runtime: {err}"))
    }
}

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
            | AppError::RuntimeError(msg)
            | AppError::SerdeJsonError(msg)
            | AppError::TauriError(msg) => write!(f, "{msg}"),
        }
    }
}

impl From<ReqwestError> for AppError {
    fn from(err: ReqwestError) -> Self {
        AppError::ReqwestError(err.to_string())
    }
}

impl From<SerdeJsonError> for AppError {
    fn from(err: SerdeJsonError) -> Self {
        AppError::SerdeJsonError(err.to_string())
    }
}
