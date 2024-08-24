use scannedpdf::{create, PageConfig, PageSize, PDF};
use std::fs::File;

use crate::assets::detect_images;

pub fn convert_folder(path_to_source: String, path_to_destination: String, pdf_name: String) -> Result<(), Box<dyn std::error::Error>> {
    let images: Vec<(image::DynamicImage, std::path::PathBuf)> = detect_images(path_to_source);
    let default_config: PageConfig = PageConfig::new();
    let mut file: PDF<File> = create(
        format!("{}/{}", path_to_destination, pdf_name),
        default_config,
        images.len(),
    )
    .unwrap();
    images.into_iter().enumerate().for_each(|(_, (image, _))| {
        let config: PageConfig = PageConfig::new()
            .size(PageSize::Custom(image.width(), image.height()))
            .quality(100);
        file.add_page_from_image(image, Some(format!("Image")), Some(config))
            .unwrap();
    });
    file.finish().unwrap();
    Ok(())
}
