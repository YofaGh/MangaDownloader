import api from "./api";

export async function get_doujin_images(domain, code) {
  const response = await api.post(`/doujin/images/`, {domain, code});
  return response.data;
}

export async function get_manga_images(domain, url, chapter) {
  const response = await api.post(`/manga/images/`, {domain, url, chapter});
  return response.data;
}