import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

const getBackendMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) return "";
  const payload = error.response?.data as { message?: string | string[] };
  if (Array.isArray(payload?.message)) return payload.message.join(" ");
  return typeof payload?.message === "string" ? payload.message : "";
};

// Adjunta el token JWT automáticamente en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Renueva el token automáticamente cuando expira (401)
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const message = getBackendMessage(error);
    if (
      error.response?.status === 401 &&
      message.toLowerCase().includes("usuario no encontrado")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("rol");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        try {
          const { data } = await axios.post<{
            access_token: string;
            refresh_token: string;
          }>(`${import.meta.env.VITE_API_URL}/auth/refresh-token`, {
            refreshToken,
          });
          localStorage.setItem("token", data.access_token);
          if (data.refresh_token)
            localStorage.setItem("refresh_token", data.refresh_token);

          if (!localStorage.getItem("rol")) {
            try {
              const meResponse = await axios.get<{ rol?: string }>(
                `${import.meta.env.VITE_API_URL}/auth/me`,
                {
                  headers: {
                    Authorization: `Bearer ${data.access_token}`,
                  },
                },
              );
              const role = meResponse.data?.rol;
              if (typeof role === "string") {
                localStorage.setItem("rol", role.toLowerCase());
              }
            } catch {
              localStorage.removeItem("rol");
            }
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          }
          return api(originalRequest);
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("rol");
          window.location.href = "/login";
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("rol");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
