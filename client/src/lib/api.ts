import { api, buildUrl } from "@shared/routes";

export const getToken = () => localStorage.getItem("medibot_token");
export const setToken = (token: string) => localStorage.setItem("medibot_token", token);
export const removeToken = () => localStorage.removeItem("medibot_token");

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, { ...options, headers });
  
  if (!res.ok) {
    if (res.status === 401) {
      removeToken();
    }
    const data = await res.json().catch(() => null);
    throw new Error(data?.message || res.statusText);
  }
  
  return res.json();
}
