"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/services/apiClient";
import Cookies from "js-cookie";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await apiClient.post("/auth/login", { email, password });

            const data = res.data;

            Cookies.set("token", data.accessToken, { path: "/", expires: 7 });
            localStorage.setItem("token", data.accessToken);
            localStorage.setItem("user", JSON.stringify(data.user));

            if (data.tenantId) {
                Cookies.set("tenantId", data.tenantId, { path: "/", expires: 7 });
                localStorage.setItem("activeTenantId", data.tenantId);
                localStorage.setItem("tenantId", data.tenantId);

                router.push("/dashboard");
            } else {
                Cookies.remove("tenantId", { path: "/", expires: 7 });
                setError("Your account has no active workspace.");
            }
        } catch (err: any) {
            setError(err.response?.data?.error || "Invalid email or password");
        }
    };

    return (
        <div className="flex min-h-[calc(100vh-theme(spacing.24))] items-center justify-center p-4">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>VARIX Login</CardTitle>
                    <CardDescription>Sign in to your workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <a href="/register" className="text-blue-500 hover:underline">
                            Register here
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
