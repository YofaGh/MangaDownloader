use reqwest::Error as ReqwestError;
use serde_json::Error as SerdeJsonError;
use std::{
    fmt::{Display, Formatter, Result as FmtResult},
    io::Error as IoError,
    path::Path,
};

#[derive(Debug)]
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

impl Display for Error {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            Error::DirectoryOperation(msg)
            | Error::FileOperation(msg)
            | Error::ImageError(msg)
            | Error::LibraryError(msg)
            | Error::Other(msg)
            | Error::ParserError(msg)
            | Error::PdfError(msg)
            | Error::ReqwestError(msg)
            | Error::SemverError(msg)
            | Error::RuntimeError(msg)
            | Error::SerdeJsonError(msg)
            | Error::TauriError(msg) => write!(f, "{msg}"),
        }
    }
}

impl From<ReqwestError> for Error {
    fn from(err: ReqwestError) -> Self {
        Error::ReqwestError(err.to_string())
    }
}

impl From<SerdeJsonError> for Error {
    fn from(err: SerdeJsonError) -> Self {
        Error::SerdeJsonError(err.to_string())
    }
}
