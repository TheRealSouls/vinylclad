"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/deals", label: "Deals" },
  { href: "/collection", label: "Collection" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/settings", label: "Settings" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex gap-5 overflow-x-auto overflow-y-hidden -mb-[2px] [scrollbar-width:none] text-[15px]">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "pb-3 border-b-[3px] whitespace-nowrap",
              active ? "border-accent font-semibold" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
