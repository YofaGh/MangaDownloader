import api from "./api";

export default async function get_info(domain, url) {
  const response = await api.get(`/info/${domain}/${url}/`);
  return response.data;
}
