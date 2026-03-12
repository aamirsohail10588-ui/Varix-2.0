import axios from "axios";
import Cookies from "js-cookie";

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    // Read token from localStorage or Cookies
    const token = typeof window !== "undefined" ? (localStorage.getItem("token") || Cookies.get("token")) : null;

    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Also include tenantId if available
    const tenantId = typeof window !== "undefined" ? (localStorage.getItem("tenantId") || Cookies.get("tenantId")) : null;
    if (tenantId && config.headers) {
        config.headers["x-tenant-id"] = tenantId;
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Centralized redirect to login on unauthorized
            if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                localStorage.removeItem("token");
                localStorage.removeItem("tenantId");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
