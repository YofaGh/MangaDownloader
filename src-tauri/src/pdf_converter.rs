use image::DynamicImage;
use scannedpdf::{create, Error as PdfError, PageConfig, PageSize, PDF};
use std::{fs::File, io::Error as IoError, path::PathBuf};

use crate::{assets::detect_images, errors::Error};

pub fn convert_folder(path: &str, pdf_name: &str) -> Result<(), Error> {
    let images: Vec<DynamicImage> = detect_images(path)
        .unwrap_or_default()
        .into_iter()
        .map(|(image, _)| image)
        .collect();
    if images.is_empty() {
        return Err(Error::no_images(path));
    }
    let path_buf: PathBuf = PathBuf::from(format!("{path}/{pdf_name}"));
    let mut file: PDF<File> = create(&path_buf, PageConfig::new(), images.len())
        .map_err(|err: IoError| Error::file("create", &path_buf, err))?;
    images
        .into_iter()
        .try_for_each(|image: DynamicImage| -> Result<(), Error> {
            let config: PageConfig = PageConfig::new()
                .size(PageSize::Custom(image.width(), image.height()))
                .quality(100);
            file.add_page_from_image(image, Some("Image".to_owned()), Some(config))
                .map_err(|err: PdfError| {
                    Error::PdfError(format!("Failed to add page from image: {:?}", err))
                })
        })?;
    file.finish()
        .map_err(|err: IoError| Error::file("save", &path_buf, err))
}
