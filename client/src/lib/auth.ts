import { api } from "@/lib/api";

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  if (typeof window !== "undefined") {
    localStorage.setItem("broscode_token", data.token);
  }
  return data.user;
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post("/auth/register", { name, email, password });
  if (typeof window !== "undefined") {
    localStorage.setItem("broscode_token", data.token);
  }
  return data.user;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("broscode_token");
  }
}
