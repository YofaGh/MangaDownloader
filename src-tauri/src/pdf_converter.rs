use image::DynamicImage;
use scannedpdf::{create, PageConfig, PageSize, PDF};
use std::{error::Error, fs::File, path::PathBuf};

use crate::assets::detect_images;

pub fn convert_folder(path: String, pdf_name: String) -> Result<(), Box<dyn Error>> {
    let images: Vec<(DynamicImage, PathBuf)> = detect_images(path.clone());
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
