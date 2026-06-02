import axios from "axios";

// In dev, Vite proxies /api -> http://localhost:8000 (see vite.config.js).
const api = axios.create({
  baseURL: "/api",
  timeout: 12000,
});

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
