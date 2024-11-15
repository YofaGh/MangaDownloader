use image::DynamicImage;
use scannedpdf::{create, PageConfig, PageSize, PDF};
use std::{fs::File, path::PathBuf};

use crate::{assets::detect_images, errors::AppError};

pub fn convert_folder(path: &str, pdf_name: &str) -> Result<(), AppError> {
    let images: Vec<(DynamicImage, PathBuf)> = detect_images(path).unwrap_or_default();
    if images.is_empty() {
        return Err(AppError::NoImages(format!("No images found in {}", path)));
    }
    let default_config: PageConfig = PageConfig::new();
    let mut file: PDF<File> = create(
        format!("{}/{}", path, pdf_name),
        default_config,
        images.len(),
    )
    .unwrap();
    images.into_iter().for_each(|(image, _)| {
        let config: PageConfig = PageConfig::new()
            .size(PageSize::Custom(image.width(), image.height()))
            .quality(100);
        file.add_page_from_image(image, Some(format!("Image")), Some(config))
            .unwrap();
    });
    file.finish().unwrap();
    Ok(())
}
