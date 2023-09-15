import api from "./api";

async function get_chapters(domain, url) {
  const response = await api.get(`/get_chapters/${domain}/${url}/`);
  return response.data;
}

export default get_chapters;
