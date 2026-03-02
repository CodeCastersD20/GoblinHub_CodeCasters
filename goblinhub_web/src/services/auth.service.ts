import api from "../lib/api";
import type { RegisterUserDto, MeResponseDto } from "../types/auth.types";

export const login = (email: string, password: string) =>
  api.post("/auth/signin", { email, password });

export const register = (data: RegisterUserDto) =>
  api.post("/auth/signup", data);

export const getMe = () => api.get<MeResponseDto>("/auth/me");

export const logout = () => {
  localStorage.removeItem("token");
};
