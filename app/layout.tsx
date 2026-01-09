import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";
import { UserProvider } from "@/contexts/UserContext";


const inter = Inter({
  weight: "100",
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Acculog - Attendance & Time Tracking System",
  description: "Created in NextJs Developed By Fluxx Tech Solutions",
  icons: {
    icon: "/fluxx.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.variable} font-sans antialiased relative`}>
        <UserProvider>
          {children}
          <Toaster />

        
        </UserProvider>
      </body>
    </html>
  );
}
