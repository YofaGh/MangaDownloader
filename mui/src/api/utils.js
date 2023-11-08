import api from "./api";

export async function get_saucers_list() {
  const response = await api.get("/get_saucers_list/");
  return response.data;
}

export async function convertToPdf(
  path_to_source,
  path_to_destination,
  pdf_name
) {
  const response = await api.post("/convert/", {
    path_to_source,
    path_to_destination,
    pdf_name,
  });
  return response.data;
}

export async function mergeImages(path_to_source, path_to_destination, method) {
  const response = await api.post("/merge/", {
    path_to_source,
    path_to_destination,
    method,
  });
  return response.data;
}

export async function retrieveImage(domain, image_url) {
  const response = await api.post("/retrieve_image/", {
    domain,
    image_url,
    save_path: "",
  });
  return response.data;
}

export async function upload_image(image_url) {
  const response = await api.post("/upload_image/", { image_url });
  return response.data;
}

export async function saucer(site, url) {
  const response = await api.post("/saucer/", { site, url });
  return response.data;
}

export async function get_sample(domain) {
  const response = await api.post("/get_sample/", { domain });
  return response.data;
}

export async function validate_corrupted_image(image_path) {
  const response = await api.post("/validate_corrupted_image/", { image_path });
  return response.data;
}

export async function validate_truncated_image(image_path) {
  const response = await api.post("/validate_truncated_image/", { image_path });
  return response.data;
}
