import api from "./api";

export default async function get_logo(module) {
  const response = await api.get(`/module_logo/${module}/`);
  return response.data;
}
