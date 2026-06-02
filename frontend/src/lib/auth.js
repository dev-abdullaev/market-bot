import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE || "/api";
export function getToken() { return localStorage.getItem("token"); }
export function setToken(t) { localStorage.setItem("token", t); }
export function clearToken() { localStorage.removeItem("token"); }

export async function login(username, password) {
  const { data } = await axios.post(`${BASE}/auth/login`, { username, password });
  setToken(data.access);
  return data.user;
}
export async function telegramLogin(initData) {
  const { data } = await axios.post(`${BASE}/auth/telegram-webapp`, { init_data: initData });
  setToken(data.access);
  return data.user;
}
export async function getMe() {
  const { data } = await axios.get(`${BASE}/auth/me`,
    { headers: { Authorization: `Bearer ${getToken()}` } });
  return data;
}
export function logout() { clearToken(); }
