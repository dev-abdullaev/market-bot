import axios from "axios";

// Same token contract as the legacy frontend: a JWT access token stored in
// localStorage under "token". The shared axios instance in ./api.js reads this
// token via the request interceptor, so calls here use a bare axios client to
// avoid interceptor recursion during login.
const BASE = import.meta.env.VITE_API_BASE || "/api";

export function getToken() {
  return localStorage.getItem("token");
}
export function setToken(t) {
  localStorage.setItem("token", t);
}
export function clearToken() {
  localStorage.removeItem("token");
}

/** Username/password login → stores the access token, returns the user. */
export async function login(username, password) {
  const { data } = await axios.post(`${BASE}/auth/login`, {
    username,
    password,
  });
  setToken(data.access);
  return data.user;
}

/** Telegram WebApp login using the signed initData string. */
export async function telegramLogin(initData) {
  const { data } = await axios.post(`${BASE}/auth/telegram-webapp`, {
    init_data: initData,
  });
  setToken(data.access);
  return data.user;
}

/** Fetch the current authenticated user. */
export async function getMe() {
  const { data } = await axios.get(`${BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return data;
}

export function logout() {
  clearToken();
}
