import api from "./api";

async function get_info(domain, url) {
  const response = await api.get(`/info/${domain}/${url}/`);
  return response.data;
}

export default get_info;
