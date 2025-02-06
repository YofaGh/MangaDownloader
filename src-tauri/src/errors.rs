use reqwest::Error as ReqwestErr;
use semver::Error as SemverErr;
use serde::{Deserialize, Serialize};
use serde_json::Error as SerdeJsonErr;
use std::{
    fmt::{Display, Formatter, Result as FmtResult},
    io::Error as IoError,
    path::Path,
};

#[derive(Debug, Serialize, Deserialize)]
pub enum Error {
    DirectoryOperation(String),
    FileOperation(String),
    ImageErr(String),
    LibraryErr(String),
    Other(String),
    ParserErr(String),
    PdfErr(String),
    ReqwestErr(String),
    RuntimeErr(String),
    SemverErr(String),
    SerdeJsonErr(String),
    TauriErr(String),
}

impl Error {
    pub fn directory(action: &str, path: impl AsRef<Path>, err: IoError) -> Self {
        Self::DirectoryOperation(format!(
            "Failed to {action} the directory {}: {err}",
            path.as_ref().to_string_lossy()
        ))
    }
    pub fn file(action: &str, path: impl AsRef<Path>, err: IoError) -> Self {
        Self::FileOperation(format!(
            "Failed to {action} the file {}: {err}",
            path.as_ref().to_string_lossy()
        ))
    }
    pub fn library(err: String) -> Self {
        Self::LibraryErr(format!("Library error, {err}"))
    }
    pub fn lock_library(err: String) -> Self {
        Self::library(format!("Failed to get a lock on guard: {err}"))
    }
    pub fn no_images(path: &str) -> Self {
        Self::Other(format!("No images found in {path}"))
    }
    pub fn parser(url: &str, attr: &str) -> Self {
        Self::ParserErr(format!("Failed to parse html {url}: {attr}"))
    }
    pub fn window(action: &str, name: &str, err: String) -> Self {
        Self::TauriErr(format!("Failed to {action} {name}{err}"))
    }
}

impl Display for Error {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        let (error_type, msg) = match self {
            Error::DirectoryOperation(msg) => ("Directory operation error", msg),
            Error::FileOperation(msg) => ("File operation error", msg),
            Error::ImageErr(msg) => ("Image error", msg),
            Error::LibraryErr(msg) => ("Library error", msg),
            Error::Other(msg) => ("Other error", msg),
            Error::ParserErr(msg) => ("Parser error", msg),
            Error::PdfErr(msg) => ("PDF error", msg),
            Error::ReqwestErr(msg) => ("Reqwest error", msg),
            Error::RuntimeErr(msg) => ("Runtime error", msg),
            Error::SemverErr(msg) => ("Semver error", msg),
            Error::SerdeJsonErr(msg) => ("Serde JSON error", msg),
            Error::TauriErr(msg) => ("Tauri error", msg),
        };
        write!(f, "{error_type}: {msg}")
    }
}

impl From<ReqwestErr> for Error {
    fn from(err: ReqwestErr) -> Self {
        Error::ReqwestErr(err.to_string())
    }
}

impl From<SemverErr> for Error {
    fn from(err: SemverErr) -> Self {
        Error::SemverErr(err.to_string())
    }
}

impl From<SerdeJsonErr> for Error {
    fn from(err: SerdeJsonErr) -> Self {
        Error::SerdeJsonErr(err.to_string())
    }
}
