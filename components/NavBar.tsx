"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today", emoji: "✨" },
  { href: "/closet", label: "Closet", emoji: "👚" },
  { href: "/tryon", label: "Try-on", emoji: "🪞" },
  { href: "/outfits", label: "Outfits", emoji: "📒" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Virtual&nbsp;Closet
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  pathname === l.href
                    ? "bg-ink text-cream"
                    : "hover:bg-ink/5"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-ink/10 bg-white py-2 sm:hidden">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center px-3 py-1 text-xs ${
              pathname === l.href ? "font-semibold" : "text-ink/60"
            }`}
          >
            <span className="text-base">{l.emoji}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
