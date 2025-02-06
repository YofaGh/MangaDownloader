use reqwest::Error as ReqwestErr;
use serde_json::Error as SerdeJsonErr;
use std::{
    fmt::{Display, Formatter, Result as FmtResult},
    io::Error as IoError,
    path::Path,
};

#[derive(Debug)]
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
    pub fn file(action: &str, path: impl AsRef<Path>, err: IoError) -> Self {
        Self::FileOperation(format!(
            "Failed to {action} the file {}: {err}",
            path.as_ref().to_string_lossy()
        ))
    }
    pub fn parser(url: &str, attr: &str) -> Self {
        Self::ParserErr(format!("Failed to parse html {url}: {attr}"))
    }
    pub fn runtime(err: IoError) -> Self {
        Self::RuntimeErr(format!("Runtime error: Failed to execute runtime: {err}"))
    }
}

impl Display for Error {
    fn fmt(&self, f: &mut Formatter<'_>) -> FmtResult {
        match self {
            Error::DirectoryOperation(msg)
            | Error::FileOperation(msg)
            | Error::ImageErr(msg)
            | Error::LibraryErr(msg)
            | Error::Other(msg)
            | Error::ParserErr(msg)
            | Error::PdfErr(msg)
            | Error::ReqwestErr(msg)
            | Error::SemverErr(msg)
            | Error::RuntimeErr(msg)
            | Error::SerdeJsonErr(msg)
            | Error::TauriErr(msg) => write!(f, "{msg}"),
        }
    }
}

impl From<ReqwestErr> for Error {
    fn from(err: ReqwestErr) -> Self {
        Error::ReqwestErr(err.to_string())
    }
}

impl From<SerdeJsonErr> for Error {
    fn from(err: SerdeJsonErr) -> Self {
        Error::SerdeJsonErr(err.to_string())
    }
}
