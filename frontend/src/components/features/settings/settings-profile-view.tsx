"use client";

import React, { useState } from "react";
import Link from "next/link";
import { KeyRound, Trash2, Upload, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/utils";
import type { User as UserType } from "@/types/auth";

interface SettingsProfileViewProps {
  user: UserType | null;
  onUpdateProfile: (firstName: string, lastName: string) => Promise<void> | void;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<void> | void;
  onUploadAvatar?: (file: File) => Promise<void> | void;
  onDeleteAvatar?: () => Promise<void> | void;
}

export function SettingsProfileView({
  user,
  onUpdateProfile,
  onChangePassword,
  onUploadAvatar,
  onDeleteAvatar,
}: SettingsProfileViewProps) {
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSavingProfile(true);
    try {
      await onUpdateProfile(firstName.trim(), lastName.trim());
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    if (newPassword.length < 8) {
      setPwdError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSavingPassword(true);
    try {
      await onChangePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
            Paramètres du compte
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            Gérez votre identité, votre photo de profil et la sécurité de votre
            session.
          </p>
        </div>
        <Link href="/settings/household">
          <Button variant="secondary">
            <Users className="h-4 w-4" />
            Gérer le Mode Couple
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <CardTitle>Informations personnelles</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Avatar Row */}
            <div className="flex items-center gap-4">
              {user?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt="Avatar utilisateur"
                  className="h-14 w-14 rounded-full border border-slate-200 object-cover dark:border-zinc-700"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-base font-semibold text-white dark:bg-zinc-100 dark:text-zinc-950">
                  {getInitials(user?.first_name, user?.last_name)}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {onUploadAvatar && (
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-200 dark:hover:bg-zinc-800">
                    <Upload className="h-3.5 w-3.5" />
                    Changer l&apos;avatar
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadAvatar(file);
                      }}
                    />
                  </label>
                )}
                {user?.avatar_url && onDeleteAvatar && (
                  <Button
                    size="sm"
                    variant="danger-outline"
                    onClick={onDeleteAvatar}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Retirer
                  </Button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Adresse e-mail
                </label>
                <input
                  id="profile-email"
                  type="email"
                  disabled
                  value={user?.email ?? ""}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-first"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                  >
                    Prénom
                  </label>
                  <input
                    id="profile-first"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-last"
                    className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                  >
                    Nom
                  </label>
                  <input
                    id="profile-last"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
                  />
                </div>
              </div>

              <Button type="submit" disabled={savingProfile}>
                {savingProfile
                  ? "Enregistrement..."
                  : "Enregistrer le profil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-500" />
              <CardTitle>Sécurité & Mot de passe</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePassword} className="space-y-4">
              {pwdError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
                >
                  {pwdError}
                </div>
              )}

              <div>
                <label
                  htmlFor="pwd-old"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Mot de passe actuel
                </label>
                <input
                  id="pwd-old"
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
                />
              </div>

              <div>
                <label
                  htmlFor="pwd-new"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Nouveau mot de passe
                </label>
                <input
                  id="pwd-new"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
                />
              </div>

              <div>
                <label
                  htmlFor="pwd-confirm"
                  className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-zinc-300"
                >
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  id="pwd-confirm"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-[#18181B]"
                />
              </div>

              <Button type="submit" disabled={savingPassword}>
                {savingPassword
                  ? "Mise à jour..."
                  : "Mettre à jour le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
