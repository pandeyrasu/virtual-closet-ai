import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Virtual Closet",
  description:
    "Your personal AI wardrobe: catalog your clothes, get weather-aware outfit suggestions, and try them on with your own photos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
