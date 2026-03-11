import axios from "axios";

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    headers: {
        "Content-Type": "application/json",
    },
});

apiClient.interceptors.request.use((config) => {
    // Read token from localStorage as requested
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Also include tenantId if available in localStorage
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;
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
