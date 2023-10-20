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
