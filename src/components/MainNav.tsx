"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart2, Wrench } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Analytics", href: "/analytics", icon: BarChart2 },
  { name: "Settings", href: "/settings", icon: Wrench },
];

export function MainNav() {
  const pathname = usePathname();
  
  return (
    <nav className="sticky top-0 z-30 w-full bg-white/90 border-b border-gray-200 backdrop-blur">
      <div className="max-w-5xl mx-auto flex justify-center">
        <ul className="flex gap-2 md:gap-6 py-2 md:py-3">
          {navItems.map(({ name, href, icon: Icon }) => {
            let isActive = pathname.startsWith(href);
            // Special case: highlight Dashboard tab on /gigs and its subpages
            if (name === "Dashboard" && (pathname === "/gigs" || pathname.startsWith("/gigs/"))) {
              isActive = true;
            }
            return (
              <li key={name}>
                <Link
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
                    ${isActive ? "bg-green-100 text-green-800" : "text-gray-700 hover:bg-gray-100 hover:text-green-700"}
                  `}
                  tabIndex={0}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  <span className="hidden md:inline">{name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
} 