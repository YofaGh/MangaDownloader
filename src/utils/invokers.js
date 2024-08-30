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

export const download = async (
  webtoonId,
  module,
  webtoon,
  chapter,
  fixedTitle,
  sleepTime,
  downloadPath
) =>
  await invoke("download", {
    webtoonId,
    module,
    webtoon,
    chapter,
    fixedTitle,
    sleepTime,
    downloadPath,
  });

export const stopDownlod = async () => await invoke("stop_download");

export const searchKeyword = async (
  modules,
  keyword,
  sleepTime,
  depth,
  absolute
) =>
  await invoke("search_keyword", {
    modules,
    keyword,
    sleepTime,
    depth,
    absolute,
  });

export const searchKeywordOne = async (
  module,
  keyword,
  sleepTime,
  depth,
  absolute
) =>
  await invoke("search_keyword_one", {
    module,
    keyword,
    sleepTime,
    depth,
    absolute,
  });

export const stopSearch = async () => await invoke("stop_search");

export const getSaucersList = async () => await invoke("get_saucers_list");

export const uploadImage = async (path) =>
  await invoke("upload_image", { path });

export const sauce = async (saucer, url) =>
  await invoke("sauce", { saucer, url });

export const convert = async (path, pdfName) =>
  await invoke("convert", { path, pdfName });

export const merge = async (pathToSource, pathToDestination, mergeMethod) =>
  await invoke("merge", { pathToSource, pathToDestination, mergeMethod });

export const removeDirectory = async (path, recursive) =>
  await invoke("remove_directory", { path, recursive });

export const openFolder = async (path) => await invoke("open_folder", { path });