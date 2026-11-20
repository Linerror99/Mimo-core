"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger";
  dividerBefore?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  align?: "right" | "left";
}

const MENU_WIDTH = 192; // w-48

export function ActionMenu({
  items,
  ariaLabel = "Plus d'actions",
  align = "right",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const estimatedHeight = items.length * 34 + 16;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left =
      align === "right" ? rect.right - MENU_WIDTH : rect.left;
    left = Math.max(8, Math.min(left, viewportW - MENU_WIDTH - 8));

    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < estimatedHeight + 8 && spaceAbove > spaceBelow) {
      setCoords({
        bottom: viewportH - rect.top + 4,
        left,
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left,
      });
    }
  }, [align, items.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  if (items.length === 0) return null;

  const menuContent =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: coords.top,
              bottom: coords.bottom,
              left: coords.left,
              width: MENU_WIDTH,
            }}
            onClick={(e) => e.stopPropagation()}
            className="z-[100] rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-zinc-800 dark:bg-[#18181B]"
          >
            {items.map((item, idx) => (
              <React.Fragment key={`${item.label}-${idx}`}>
                {item.dividerBefore && (
                  <div className="my-1 border-t border-slate-100 dark:border-zinc-800" />
                )}
                {item.href ? (
                  <Link
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
                      item.variant === "danger"
                        ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        : "text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    {item.icon && (
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate">{item.label}</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-45",
                      item.variant === "danger"
                        ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        : "text-slate-700 hover:bg-slate-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    {item.icon && (
                      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate">{item.label}</span>
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuContent}
    </div>
  );
}
