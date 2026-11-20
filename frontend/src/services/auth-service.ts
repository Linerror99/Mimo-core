import { apiRequest, setStoredAccessToken } from "@/lib/api-client";
import type {
  LoginPayload,
  RegisterPayload,
  TokenResponse,
  User,
} from "@/types/auth";

export const authService = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const data = await apiRequest<TokenResponse>("/auth/login", {
      method: "POST",
      body: payload,
      skipAuthRefresh: true,
    });
    if (data.access_token) {
      setStoredAccessToken(data.access_token);
    }
    return data;
  },

  async register(payload: RegisterPayload): Promise<User> {
    return apiRequest<User>("/auth/register", {
      method: "POST",
      body: payload,
      skipAuthRefresh: true,
    });
  },

  async logout(): Promise<void> {
    try {
      await apiRequest<void>("/auth/logout", {
        method: "POST",
        skipAuthRefresh: true,
      });
    } finally {
      setStoredAccessToken(null);
    }
  },

  async getMe(): Promise<User> {
    return apiRequest<User>("/users/me");
  },

  async updateProfile(firstName: string, lastName: string): Promise<User> {
    return apiRequest<User>("/users/me", {
      method: "PATCH",
      body: { first_name: firstName, last_name: lastName },
    });
  },

  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    await apiRequest<void>("/users/me/password", {
      method: "PATCH",
      body: { old_password: oldPassword, new_password: newPassword },
    });
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    return apiRequest<{ avatar_url: string }>("/users/me/avatar", {
      method: "POST",
      body: formData,
    });
  },

  async deleteAvatar(): Promise<void> {
    await apiRequest<void>("/users/me/avatar", { method: "DELETE" });
  },

  async forgotPassword(
    email: string
  ): Promise<{ message: string; expires_in_minutes: number }> {
    return apiRequest("/auth/forgot-password", {
      method: "POST",
      body: { email },
      skipAuthRefresh: true,
    });
  },

  async verifyResetCode(
    email: string,
    code: string
  ): Promise<{ valid: boolean; message: string }> {
    return apiRequest("/auth/verify-reset-code", {
      method: "POST",
      body: { email, code },
      skipAuthRefresh: true,
    });
  },

  async resetPassword(
    email: string,
    code: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return apiRequest("/auth/reset-password", {
      method: "POST",
      body: { email, code, new_password: newPassword },
      skipAuthRefresh: true,
    });
  },
};
