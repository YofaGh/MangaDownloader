use image::{
    imageops::{overlay, FilterType::Lanczos3},
    DynamicImage, ImageBuffer, Rgb, RgbImage,
};
use rayon::{
    iter::{IndexedParallelIterator, ParallelIterator},
    prelude::IntoParallelIterator,
};
use std::{
    cmp::max,
    fs::{copy, create_dir_all},
    path::PathBuf,
};

use crate::{assets::detect_images, errors::AppError};

pub fn merge_folder(
    path_to_source: &str,
    path_to_destination: &str,
    merge_method: &str,
) -> Result<(), AppError> {
    let images: Vec<(DynamicImage, PathBuf)> = detect_images(path_to_source).unwrap_or_default();
    if images.is_empty() {
        return Err(AppError::NoImages(format!(
            "No images found in {}",
            path_to_source
        )));
    }
    create_dir_all(path_to_destination)?;
    if merge_method == "Normal" {
        merge(images, path_to_destination);
    } else {
        merge_fit(images, path_to_destination);
    }
    Ok(())
}

pub fn merge(images: Vec<(DynamicImage, PathBuf)>, path_to_destination: &str) {
    let mut lists_to_merge: Vec<(Vec<(DynamicImage, PathBuf)>, u32, u32)> = vec![];
    let mut temp_list: Vec<(DynamicImage, PathBuf)> = vec![];
    let mut temp_height: u32 = 0;
    let mut max_width: u32 = 0;
    for (image, filename) in images {
        if temp_height + image.height() < 65500 {
            temp_list.push((image.clone(), filename.clone()));
            temp_height += image.height();
            max_width = max(max_width, image.width());
        } else {
            lists_to_merge.push((temp_list.clone(), max_width, temp_height));
            temp_list = vec![(image.clone(), filename.clone())];
            temp_height = image.height();
            max_width = image.width();
        }
    }
    lists_to_merge.push((temp_list.clone(), max_width, temp_height));
    lists_to_merge.into_par_iter().enumerate().for_each(
        |(index, (list_to_merge, max_width, total_height))| {
            if list_to_merge.len() == 1 {
                copy_image(path_to_destination, index, &list_to_merge[0].1);
                return;
            }
            let mut imgbuf: RgbImage =
                ImageBuffer::from_pixel(max_width, total_height, Rgb([255, 255, 255]));
            let mut y_offset: u32 = 0;
            for (image, _) in list_to_merge {
                let x_offset: u32 = (max_width - image.width()) / 2;
                overlay(
                    &mut imgbuf,
                    &image.to_rgb8(),
                    x_offset as i64,
                    y_offset as i64,
                );
                y_offset += image.height();
            }
            imgbuf
                .save(format!("{}/{:03}.jpg", path_to_destination, index + 1))
                .ok();
        },
    );
}

pub fn merge_fit(images: Vec<(DynamicImage, PathBuf)>, path_to_destination: &str) {
    let mut lists_to_merge: Vec<(Vec<(DynamicImage, PathBuf)>, u32, u32)> = vec![];
    let mut current_height: u32 = 0;
    let mut temp_list: Vec<(DynamicImage, PathBuf)> = vec![];
    let mut min_width: u32 = images[0].0.width();
    for (image, filename) in images {
        if image.width() >= min_width
            && (current_height + image.height() * min_width / image.width()) < 65500
        {
            temp_list.push((image.clone(), filename.clone()));
            current_height += image.height() * min_width / image.width();
        } else if image.width() < min_width
            && (current_height * image.width() / min_width + image.height()) < 65500
        {
            temp_list.push((image.clone(), filename.clone()));
            current_height = current_height * image.width() / min_width + image.height();
            min_width = image.width();
        } else {
            lists_to_merge.push((temp_list.clone(), min_width, current_height));
            temp_list = vec![(image.clone(), filename.clone())];
            min_width = image.width();
            current_height = image.height();
        }
    }
    lists_to_merge.push((temp_list.clone(), min_width, current_height));
    lists_to_merge.into_par_iter().enumerate().for_each(
        |(index, (list_to_merge, min_width, total_height))| {
            if list_to_merge.len() == 1 {
                copy_image(path_to_destination, index, &list_to_merge[0].1);
                return;
            }
            let mut imgbuf: RgbImage =
                ImageBuffer::from_pixel(min_width, total_height, Rgb([255, 255, 255]));
            let mut y_offset: u32 = 0;
            for (image, _) in list_to_merge {
                let scaled_height: u32 =
                    (image.height() as f64 * min_width as f64 / image.width() as f64).ceil() as u32;
                let resized_image: DynamicImage =
                    image.resize_exact(min_width, scaled_height, Lanczos3);
                overlay(&mut imgbuf, &resized_image.to_rgb8(), 0, y_offset as i64);
                y_offset += scaled_height;
            }
            imgbuf
                .save(format!("{}/{:03}.jpg", path_to_destination, index + 1))
                .ok();
        },
    );
}

fn copy_image(path_to_destination: &str, index: usize, path: &PathBuf) {
    copy(
        path,
        format!(
            "{}/{:03}.{}",
            path_to_destination,
            index + 1,
            path.extension().unwrap().to_str().unwrap()
        ),
    )
    .unwrap();
}
