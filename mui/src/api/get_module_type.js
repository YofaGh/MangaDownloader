import api from "./api";

export default async function get_module_type(module) {
  const response = await api.get(`/type/${module}/`);
  return response.data;
}
