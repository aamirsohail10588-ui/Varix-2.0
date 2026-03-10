export interface UserPayload {
    userId: string;
    tenantId?: string;
    role?: string;
}

export interface AuthResponse {
    user: any;
    accessToken: string;
    refreshToken: string;
}

export interface LoginResponse {
    user?: any;
    accessToken?: string;
    refreshToken?: string;
    mfaRequired?: boolean;
    userId?: string;
}
