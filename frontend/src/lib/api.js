import axios from "axios";
import { getToken, clearToken } from "./auth";

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.js).
const api = axios.create({
  baseURL: "/api",
  timeout: 12000,
});

// Attach the JWT bearer token (if any) to every request.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 the token is stale/invalid — drop it so ProtectedRoute re-auths.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) clearToken();
    return Promise.reject(err);
  }
);

export async function fetchShop(slug) {
  const { data } = await api.get(`/shop/${slug}`);
  return data;
}

export async function fetchCatalog(slug) {
  const { data } = await api.get(`/shop/${slug}/catalog`);
  // Shape: { categories: [{ id, name_ru, name_uz, image_url, products: [...] }] }
  return data?.categories ?? [];
}

export default api;
