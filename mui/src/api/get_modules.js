import api from "./api";

export default async function get_modules() {
  const response = await api.get(`/modules/`);
  return response.data;
}
