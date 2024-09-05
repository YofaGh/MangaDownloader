import { invoke } from "@tauri-apps/api/core";

export const getModules = async () => await invoke("get_modules");

export const getModuleSample = async (domain) =>
  await invoke("get_module_sample", { domain });

export const getInfo = async (domain, url) =>
  await invoke("get_info", { domain, url });

export const getChapters = async (domain, url) =>
  await invoke("get_chapters", { domain, url });

export const getImages = async (domain, manga, chapter) =>
  await invoke("get_images", { domain, manga, chapter });

export const downloadImage = async (domain, url, imageName) =>
  await invoke("download_image", { domain, url, imageName });

export const retrieveImage = async (domain, url) =>
  await invoke("retrieve_image", { domain, url });

export const validateImage = async (path) =>
  await invoke("validate_image", { path });

export const getSaucersList = async () => await invoke("get_saucers_list");

export const uploadImage = async (path) =>
  await invoke("upload_image", { path });

export const sauce = async (saucer, url) =>
  await invoke("sauce", { saucer, url });

export const convert = async (path, pdfName) =>
  await invoke("convert", { path, pdfName });

export const merge = async (pathToSource, pathToDestination, mergeMethod) =>
  await invoke("merge", { pathToSource, pathToDestination, mergeMethod });

export const createDirectory = async (path) =>
  await invoke("create_directory", { path });

export const removeDirectory = async (path, recursive) =>
  await invoke("remove_directory", { path, recursive });

export const readDirectory = async (path) =>
  await invoke("read_directory", { path });

export const openFolder = async (path) => await invoke("open_folder", { path });

export const searchByKeyword = async (
  domain,
  keyword,
  sleepTime,
  pageLimit,
  absolute
) =>
  await invoke("search_by_keyword", {
    domain,
    keyword,
    sleepTime,
    pageLimit,
    absolute,
  });
