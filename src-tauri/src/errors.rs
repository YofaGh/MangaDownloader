use image::error::ImageError;
use scannedpdf::Error as PdfError;
use serde::{Deserialize, Serialize};
use std::io::Error as IoError;

#[derive(Debug, Serialize, Deserialize)]
pub enum AppError {
    NoImages(String),
    DirectoryCreation(String),
    DirectoryRemoval(String),
    DirectoryReading(String),
    IoError(String),
    PdfError(String),
    ImageError(String),
}

impl From<IoError> for AppError {
    fn from(err: IoError) -> Self {
        AppError::IoError(err.to_string())
    }
}

impl From<PdfError> for AppError {
    fn from(err: PdfError) -> Self {
        AppError::PdfError(format!("{:#?}", err))
    }
}

impl From<ImageError> for AppError {
    fn from(err: ImageError) -> Self {
        AppError::ImageError(err.to_string())
    }
}
