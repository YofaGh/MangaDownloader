import api from "./api";

export default async function get_chapters(domain, url) {
  const response = await api.get(`/get_chapters/${domain}/${url}/`);
  return response.data;
}
