use image::DynamicImage;
use scannedpdf::{create, PageConfig, PageSize, PDF};
use std::fs::File;

use crate::{assets::detect_images, errors::AppError};

pub fn convert_folder(path: &str, pdf_name: &str) -> Result<(), AppError> {
    let images: Vec<DynamicImage> = detect_images(path)
        .unwrap_or_default()
        .into_iter()
        .map(|(image, _)| image)
        .collect();
    if images.is_empty() {
        return Err(AppError::NoImages(format!("No images found in {}", path)));
    }
    let mut file: PDF<File> = create(
        format!("{}/{}", path, pdf_name),
        PageConfig::new(),
        images.len(),
    )?;
    images.into_iter().for_each(|image: DynamicImage| {
        let config: PageConfig = PageConfig::new()
            .size(PageSize::Custom(image.width(), image.height()))
            .quality(100);
        file.add_page_from_image(image, Some("Image".to_string()), Some(config))
            .unwrap();
    });
    Ok(file.finish()?)
}
