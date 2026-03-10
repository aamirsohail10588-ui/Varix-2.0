import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = Cookies.get("token");
    const tenantId = Cookies.get("tenantId");

    if (config.headers) {
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (tenantId) {
            config.headers["x-tenant-id"] = tenantId;
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Only redirect if not already on the login page to avoid loops
            if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
                Cookies.remove("token", { path: "/" });
                Cookies.remove("tenantId", { path: "/" });
                localStorage.removeItem("activeTenantId");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
