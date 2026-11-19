"use client";

import React from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { SettingsProfileView } from "@/components/features/settings/settings-profile-view";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "@/services/auth-service";

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();

  const handleUpdateProfile = async (firstName: string, lastName: string) => {
    try {
      const updated = await authService.updateProfile(firstName, lastName);
      setUser(updated);
      toast.success("Profil mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    }
  };

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string
  ) => {
    try {
      await authService.changePassword(oldPassword, newPassword);
      toast.success("Mot de passe modifié avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Modification impossible");
    }
  };

  const handleUploadAvatar = async (file: File) => {
    try {
      const res = await authService.uploadAvatar(file);
      if (user) {
        setUser({ ...user, avatar_url: res.avatar_url });
      }
      toast.success("Avatar mis à jour");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload impossible");
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await authService.deleteAvatar();
      if (user) {
        setUser({ ...user, avatar_url: null });
      }
      toast.success("Avatar supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible");
    }
  };

  return (
    <AppShell activePath="/settings">
      <SettingsProfileView
        key={user?.id ?? "guest"}
        user={user}
        onUpdateProfile={handleUpdateProfile}
        onChangePassword={handleChangePassword}
        onUploadAvatar={handleUploadAvatar}
        onDeleteAvatar={handleDeleteAvatar}
      />
    </AppShell>
  );
}
