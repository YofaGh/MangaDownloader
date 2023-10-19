import api from "./api";

export async function search(domain, keyword, depth, absolute, sleepTime) {
  const response = await api.post(`/search/`, { domain, keyword, depth, absolute, sleepTime });
  return response.data;
}