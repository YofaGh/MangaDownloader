import api from "./api";

async function get_modules() {
  const response = await api.get(`/modules/`);
  return response.data;
}

export default get_modules;
