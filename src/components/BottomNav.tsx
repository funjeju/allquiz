"use client";

import { usePathname, useRouter } from "next/navigation";
import { Home, Trophy, User } from "lucide-react";

const TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/ranking", label: "랭킹", icon: Trophy },
  { href: "/me", label: "내 기록", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-t border-border/60 safe-area-pb">
      <div className="max-w-4xl mx-auto flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${active ? "text-primary" : ""}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
