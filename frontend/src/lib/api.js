import axios from "axios";
import { getToken, clearToken } from "./auth.js";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE || "/api" });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response && err.response.status === 401) clearToken();
    return Promise.reject(err);
  }
);
export default api;
