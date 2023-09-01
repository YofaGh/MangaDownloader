import api from "./api";

async function get_logo(module) {
  const response = await api.get(`/module_logo/${module}/`);
  return response.data;
}

export default get_logo;
