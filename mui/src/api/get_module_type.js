import api from "./api";

async function get_module_type(module) {
  const response = await api.get(`/type/${module}/`);
  return response.data;
}

export default get_module_type;
