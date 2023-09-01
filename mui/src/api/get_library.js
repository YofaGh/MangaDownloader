import api from "./api";

async function get_library() {
  const response = await api.get(`/get_library/`);
  return response.data;
}

export default get_library;
