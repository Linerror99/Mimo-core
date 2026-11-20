import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mimo Finance — Pilotage financier personnel & couple",
  description:
    "Timeline financière unifiée, projections 5 ans, simulation What-If et gestion collaborative en couple.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

const THEME_INIT_SCRIPT = `
(function() {
  try {
    var saved = window.localStorage.getItem('mimo_theme');
    if (saved === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${jetbrainsMono.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#F8FAFC] font-sans text-sm text-[#0F172A] antialiased dark:bg-[#09090B] dark:text-[#FAFAFA]"
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
