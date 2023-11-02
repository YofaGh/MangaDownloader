import api from "./api";

export async function get_modules() {
  const response = await api.get("/modules/");
  return response.data;
}

export async function get_module_type(domain) {
  const response = await api.post("/type/", { domain });
  return response.data;
}

export async function get_info(domain, url) {
  const response = await api.post("/info/", { domain, url });
  return response.data;
}

export async function get_chapters(domain, url) {
  const response = await api.post("/get_chapters/", { domain, url });
  return response.data;
}

export async function get_doujin_title(domain, code) {
  const response = await api.post("/doujin/title/", { domain, code });
  return response.data;
}

export async function get_manga_images(domain, url, chapter) {
  const response = await api.post("/manga/images/", { domain, url, chapter });
  return response.data;
}

export async function get_doujin_images(domain, code) {
  const response = await api.post("/doujin/images/", { domain, code });
  return response.data;
}

export async function download_image(domain, image_url, save_path) {
  const response = await api.post("/download_image/", {
    domain,
    image_url,
    save_path,
  });
  return response.data;
}

export async function search(domain, keyword, page, absolute, sleep_time) {
  const response = await api.post("/search/", {
    domain,
    keyword,
    page,
    absolute,
    sleep_time,
  });
  return response.data;
}
