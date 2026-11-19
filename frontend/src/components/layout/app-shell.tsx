"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  ChevronDown,
  Command,
  Compass,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  Sun,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn, formatCurrencyEur, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePrivacyStore } from "@/stores/privacy-store";
import { accountService } from "@/services/account-service";
import { notificationService } from "@/services/notification-service";
import { QuickTransactionModal } from "@/components/shared/quick-transaction-modal";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  section: "principal" | "planification" | "systeme";
}

export const MIMO_NAV_ITEMS: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "principal",
  },
  {
    label: "Timeline",
    href: "/timeline",
    icon: CalendarClock,
    section: "principal",
  },
  {
    label: "Comptes",
    href: "/accounts",
    icon: Wallet,
    section: "principal",
  },
  {
    label: "Catégories",
    href: "/categories",
    icon: Tag,
    section: "principal",
  },
  {
    label: "Projections",
    href: "/projection",
    icon: TrendingUp,
    section: "planification",
  },
  {
    label: "Projets",
    href: "/projects",
    icon: Compass,
    section: "planification",
  },
  {
    label: "Objectifs",
    href: "/goals",
    icon: Target,
    section: "planification",
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: Bell,
    section: "systeme",
  },
  {
    label: "Corbeille",
    href: "/trash",
    icon: Trash2,
    section: "systeme",
  },
  {
    label: "Mode Couple",
    href: "/settings/household",
    icon: Users,
    section: "systeme",
  },
  {
    label: "Paramètres",
    href: "/settings",
    icon: Settings,
    section: "systeme",
  },
];

const THEME_STORAGE_KEY = "mimo_theme";
const SIDEBAR_STORAGE_KEY = "mimo_sidebar_collapsed";

function resolveAvatarSrc(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http") || avatarUrl.startsWith("/")) {
    return avatarUrl;
  }
  return `/${avatarUrl}`;
}

interface AppShellProps {
  children: React.ReactNode;
  activePath?: string;
  initialTotalBalance?: number;
  initialUnreadCount?: number;
}

export function AppShell({
  children,
  activePath,
  initialTotalBalance,
  initialUnreadCount = 0,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedPath = activePath ?? pathname ?? "/dashboard";

  const activeNavItem = useMemo(() => {
    return [...MIMO_NAV_ITEMS]
      .sort((a, b) => b.href.length - a.href.length)
      .find(
        (item) =>
          resolvedPath === item.href || resolvedPath.startsWith(`${item.href}/`)
      );
  }, [resolvedPath]);

  const currentSectionLabel = activeNavItem?.label ?? "Mimo Finance";

  const { user, refreshUser, logout } = useAuthStore();
  const { isPrivate, togglePrivacy } = usePrivacyStore();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [cmdQuery, setCmdQuery] = useState("");
  const [totalBalance, setTotalBalance] = useState<number | null>(
    initialTotalBalance ?? null
  );
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [authReady, setAuthReady] = useState<boolean>(
    process.env.NODE_ENV === "test"
  );

  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const shouldBeDark = savedTheme !== "light";
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);

    const savedCollapsed = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (savedCollapsed === "true") {
      setIsSidebarCollapsed(true);
    }

    if (process.env.NODE_ENV === "test") return;

    let cancelled = false;
    (async () => {
      const currentUser = user || (await refreshUser());
      if (cancelled) return;
      if (!currentUser) {
        const redirectTarget = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.replace(`/login?redirect=${redirectTarget}`);
        return;
      }
      setAuthReady(true);

      accountService
        .getTotalBalance()
        .then((res) => {
          if (!cancelled) setTotalBalance(res.total_balance);
        })
        .catch(() => {});

      notificationService
        .getUnreadCount()
        .then((count) => {
          if (!cancelled) setUnreadCount(count);
        })
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refreshUser]);

  // Poll unread notifications count every 30 seconds while tab is visible
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    const poll = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      notificationService
        .getUnreadCount()
        .then((count) => {
          if (!cancelled) setUnreadCount(count);
        })
        .catch(() => {});
    };
    const intervalId = window.setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [authReady]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!isProfileMenuOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isProfileMenuOpen]);

  // Keyboard shortcuts: Ctrl+K (Command Palette), Ctrl+B (Sidebar), N (Quick Transaction), Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => {
          const next = !prev;
          window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
          return next;
        });
      } else if (
        !isTyping &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.key.toLowerCase() === "n"
      ) {
        e.preventDefault();
        setIsQuickTxOpen(true);
      } else if (e.key === "Escape") {
        setIsCommandOpen(false);
        setIsQuickTxOpen(false);
        setIsMobileDrawerOpen(false);
        setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      }
      return next;
    });
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await logout();
    router.push("/login");
  };

  const avatarSrc = resolveAvatarSrc(user?.avatar_url);

  const quickActions = useMemo(
    () => [
      { label: "Nouvelle transaction", href: "/timeline?new=1", badge: "Action" },
      { label: "Nouveau compte bancaire", href: "/accounts?new=1", badge: "Action" },
      { label: "Nouveau projet What-If", href: "/projects?new=1", badge: "Action" },
      { label: "Nouvel objectif d'épargne", href: "/goals?new=1", badge: "Action" },
      ...MIMO_NAV_ITEMS.map((item) => ({
        label: item.label,
        href: item.href,
        badge: "Page",
      })),
    ],
    []
  );

  const filteredCommands = useMemo(() => {
    const q = cmdQuery.trim().toLowerCase();
    if (!q) return quickActions;
    return quickActions.filter((item) =>
      item.label.toLowerCase().includes(q)
    );
  }, [cmdQuery, quickActions]);

  const renderNavSection = (
    title: string,
    section: NavItem["section"],
    collapsed: boolean,
    onNavigate?: () => void
  ) => {
    const items = MIMO_NAV_ITEMS.filter((i) => i.section === section);
    return (
      <div className="space-y-1">
        {!collapsed && (
          <div className="px-2.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            {title}
          </div>
        )}
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavItem?.href === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors",
                isActive
                  ? "bg-violet-600 text-white shadow-sm dark:bg-violet-600 dark:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.href === "/notifications" && unreadCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 font-mono text-[11px] font-semibold text-white tabular-money">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] dark:bg-[#09090B]">
        <div className="w-full max-w-md space-y-3 p-6">
          <div className="h-5 w-36 animate-pulse rounded bg-slate-200 dark:bg-zinc-800" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-[#0F172A] dark:bg-[#09090B] dark:text-[#FAFAFA]">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-150 dark:border-zinc-800 dark:bg-[#121215] lg:flex",
          isSidebarCollapsed ? "w-[64px]" : "w-[244px]"
        )}
      >
        {/* Brand Header with Mimo Logo */}
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3 dark:border-zinc-800">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 overflow-hidden",
              isSidebarCollapsed && "mx-auto"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mimo-logo.jpg"
              alt="Logo Mimo Finance"
              className="h-8 w-8 shrink-0 rounded-lg border border-violet-500/20 object-cover"
            />
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                  Mimo Finance
                </p>
                <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                  {user?.is_in_couple ? "Foyer Couple" : "Espace Personnel"}
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Balance Pill in Sidebar (flouté en mode discret) */}
        {!isSidebarCollapsed && (
          <div className="border-b border-slate-100 p-3 dark:border-zinc-800/80">
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.04] px-3 py-2.5 dark:border-violet-500/20 dark:bg-violet-500/[0.08]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Patrimoine net
                </span>
                <Link
                  href="/timeline?new=1"
                  aria-label="Ajouter une transaction rapide"
                  className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600 text-white hover:bg-violet-700 dark:hover:bg-violet-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Link>
              </div>
              <p
                data-testid="sidebar-total-balance"
                data-privacy="amount"
                className={cn(
                  "mt-1 font-mono text-base font-semibold tracking-tight text-slate-900 tabular-money transition-[filter] duration-200 dark:text-zinc-50",
                  isPrivate && "blur-[7px] select-none hover:blur-0"
                )}
              >
                {totalBalance === null ? "—" : formatCurrencyEur(totalBalance)}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          aria-label="Navigation principale"
          className="flex-1 overflow-y-auto px-2.5 py-2"
        >
          {renderNavSection("Finances", "principal", isSidebarCollapsed)}
          {renderNavSection("Planification", "planification", isSidebarCollapsed)}
          {renderNavSection("Système", "systeme", isSidebarCollapsed)}
        </nav>

        {/* Sidebar Collapse Footer */}
        <div className="border-t border-slate-200 p-2.5 dark:border-zinc-800">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              isSidebarCollapsed
                ? "Étendre la barre latérale"
                : "Réduire la barre latérale"
            }
            title={
              isSidebarCollapsed
                ? "Étendre la barre latérale (Ctrl+B)"
                : "Réduire la barre latérale (Ctrl+B)"
            }
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
              isSidebarCollapsed && "justify-center px-0"
            )}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Réduire le menu</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header (56px) */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-[#121215]/95 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Burger (40x40px — Loi de Fitts) */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              aria-label="Ouvrir le menu de navigation"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-200 dark:hover:bg-zinc-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden text-slate-400 dark:text-zinc-500 sm:inline">
                Mimo
              </span>
              <span className="hidden text-slate-300 dark:text-zinc-700 sm:inline">
                /
              </span>
              <span className="font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                {currentSectionLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Command Palette Trigger */}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              aria-label="Recherche et actions rapides"
              className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rechercher...</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 md:inline-flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            {/* Privacy Toggle (floutage) */}
            <button
              type="button"
              onClick={togglePrivacy}
              aria-label={
                isPrivate ? "Afficher les montants" : "Masquer les montants"
              }
              title={
                isPrivate
                  ? "Mode discret actif (touche H)"
                  : "Flouter les montants (touche H)"
              }
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                isPrivate
                  ? "border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-300 dark:hover:bg-zinc-800"
              )}
            >
              {isPrivate ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>

            {/* Dark/Light Switch */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                isDark ? "Passer en mode clair" : "Passer en mode sombre"
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Notifications Quick Link */}
            <Link
              href="/notifications"
              aria-label="Voir les notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            {/* Header Right: User Avatar & Profile Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-label="Menu profil utilisateur"
                aria-expanded={isProfileMenuOpen}
                className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-1.5 pr-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-zinc-800 dark:bg-[#18181B] dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt={user ? `${user.first_name} ${user.last_name}` : "Profil"}
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-violet-500/30"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] font-semibold text-white">
                    {getInitials(user?.first_name, user?.last_name)}
                  </span>
                )}
                <span className="hidden max-w-[100px] truncate sm:inline">
                  {user?.first_name || "Profil"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {isProfileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-[#18181B]"
                >
                  <div className="border-b border-slate-100 px-2.5 py-2 dark:border-zinc-800">
                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-zinc-100">
                      {user
                        ? `${user.first_name} ${user.last_name}`
                        : "Compte Mimo"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500 dark:text-zinc-400">
                      {user?.email || ""}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <User className="h-3.5 w-3.5 text-violet-500" />
                      Mon profil & sécurité
                    </Link>
                    <Link
                      href="/settings/household"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Users className="h-3.5 w-3.5 text-violet-500" />
                      Foyer & Mode Couple
                    </Link>
                    <Link
                      href="/trash"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                      Corbeille
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 pt-1 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="mx-auto w-full max-w-[1360px] flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobileDrawerOpen && (
        <div
          data-testid="mobile-navigation-drawer"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-slate-200 bg-white dark:border-zinc-800 dark:bg-[#121215]">
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/mimo-logo.jpg"
                  alt="Logo Mimo Finance"
                  className="h-8 w-8 rounded-lg border border-violet-500/20 object-cover"
                />
                <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                  Mimo Finance
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-label="Fermer le menu de navigation"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-2">
              {renderNavSection("Finances", "principal", false, () =>
                setIsMobileDrawerOpen(false)
              )}
              {renderNavSection("Planification", "planification", false, () =>
                setIsMobileDrawerOpen(false)
              )}
              {renderNavSection("Système", "systeme", false, () =>
                setIsMobileDrawerOpen(false)
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Command Palette (Ctrl+K) */}
      {isCommandOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Palette de commandes"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-[1px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCommandOpen(false);
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-[#18181B]">
            <div className="flex items-center gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-zinc-800">
              <Search className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
              <input
                type="text"
                autoFocus
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="Rechercher une page, un compte ou lancer une action..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setIsCommandOpen(false)}
                className="rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-zinc-700 dark:text-zinc-400"
              >
                ESC
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-slate-500 dark:text-zinc-400">
                  Aucun résultat pour « {cmdQuery} ».
                </p>
              ) : (
                filteredCommands.map((cmd) => (
                  <button
                    key={`${cmd.badge}-${cmd.href}`}
                    type="button"
                    onClick={() => {
                      setIsCommandOpen(false);
                      setCmdQuery("");
                      router.push(cmd.href);
                    }}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-violet-500/10 hover:text-violet-700 dark:text-zinc-200 dark:hover:text-violet-300"
                  >
                    <span>{cmd.label}</span>
                    <span className="rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
                      {cmd.badge}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick Transaction FAB (bottom-right, purple accent) */}
      <button
        type="button"
        data-testid="quick-transaction-fab"
        onClick={() => setIsQuickTxOpen(true)}
        aria-label="Ajouter une transaction rapide"
        title="Transaction rapide (touche N)"
        className="fixed bottom-6 right-6 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.03] hover:bg-violet-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#09090B]"
      >
        <Plus className="h-5 w-5" />
        <span className="hidden sm:inline">Transaction</span>
      </button>

      {isQuickTxOpen && (
        <QuickTransactionModal
          open={isQuickTxOpen}
          onClose={() => setIsQuickTxOpen(false)}
        />
      )}
    </div>
  );
}
