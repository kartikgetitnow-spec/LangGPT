import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LangGPT",
  description: "A fast, authentic, and modern LangGPT interface built with Next.js and LangChain",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#212121" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth().catch(() => null);
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("langgpt_theme")?.value;
  const initialTheme = (themeCookie === "light" || themeCookie === "system") ? themeCookie : "dark";
  const isDark = initialTheme !== "light";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={{ colorScheme: isDark ? "dark" : "light" }}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${isDark ? "dark" : ""}`}
    >
      <body className="h-[100dvh] w-full overflow-hidden flex flex-col bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 touch-manipulation">
        <AuthProvider session={session}>
          <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
