import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
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
      <body className="h-full w-full overflow-hidden flex flex-col bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100">
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            try {
              var theme = localStorage.getItem('langgpt_theme') || 'dark';
              var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (isDark) {
                document.documentElement.classList.add('dark');
                document.documentElement.style.colorScheme = 'dark';
              } else {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
              }
            } catch (e) {}
          `}
        </Script>
        <AuthProvider session={session}>
          <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
