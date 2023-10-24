import api from "./api";

export async function convertToPdf(pathToSource, pathToDestination, pdfName) {
  const response = await api.post(`/convert/`, {
    path_to_source: pathToSource,
    path_to_destination: pathToDestination,
    pdf_name: pdfName,
  });
  return response.data;
}

export async function mergeImages(pathToSource, pathToDestination, method) {
  const response = await api.post(`/merge/`, {
    path_to_source: pathToSource,
    path_to_destination: pathToDestination,
    method: method,
  });
  return response.data;
}

export async function retrieveImage(domain, image_url) {
  const response = await api.post(`/retrieve_image/`, {
    domain: domain,
    image_url: image_url,
    save_path: "",
  });
  return response.data;
}

export async function upload_image(image_url) {
  const response = await api.post(`/upload_image/`, {
    url: image_url,
  });
  return response.data;
}

export async function saucer(site, url) {
  const response = await api.post(`/saucer/`, {
    site: site,
    url: url,
  });
  return response.data;
}

export async function get_saucers_list() {
  const response = await api.get(`/get_saucers_list/`);
  return response.data;
}
