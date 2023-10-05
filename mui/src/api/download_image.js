import api from "./api";

export async function download_image(domain, image_url, save_path) {
  const response = await api.post(`/download_image/`, {domain: domain, image_url: image_url, save_path: save_path});
  return response.data;
}