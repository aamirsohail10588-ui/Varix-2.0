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

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [tenantName, setTenantName] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await apiClient.post("/auth/register", {
                email,
                password,
                name,
                tenantName,
            });
            const data = res.data;

            Cookies.set("token", data.accessToken, { path: "/", expires: 7 });
            localStorage.setItem("user", JSON.stringify(data.user));

            if (data.tenantId) {
                Cookies.set("tenantId", data.tenantId, { path: "/", expires: 7 });
                localStorage.setItem("activeTenantId", data.tenantId);
            }
            router.push("/dashboard");
        } catch (err) {
            setError("Registration failed. Please check your details.");
        }
    };

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
            <Card className="w-[450px]">
                <CardHeader>
                    <CardTitle>VARIX Registration</CardTitle>
                    <CardDescription>Create a new company workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="tenantName">Workspace Name (Company)</Label>
                            <Input
                                id="tenantName"
                                type="text"
                                required
                                value={tenantName}
                                onChange={(e) => setTenantName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
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
                            Register Workspace
                        </Button>
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Already have an account?{" "}
                        <a href="/login" className="text-blue-500 hover:underline">
                            Log in
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
