"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const navigation = [
  { href: "/", icon: "grid" as const, label: "Dashboard" },
  { href: "/design-system", icon: "layers" as const, label: "Design system" },
];

export function AppShell({ activePath, children }: { activePath: string; children: ReactNode }) {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);

  const closeNavigation = () => setIsNavigationOpen(false);

  return (
    <div className="app-shell">
      <aside className={cn("app-sidebar", isNavigationOpen && "app-sidebar--open")} id="ripplelab-sidebar">
        <div className="app-sidebar__brand">
          <span aria-hidden="true" className="brand-mark">
            R
          </span>
          <span>
            <strong>RippleLab</strong>
            <small>economic digital twin</small>
          </span>
          <button
            aria-label="Close navigation"
            className="mobile-nav-close"
            onClick={closeNavigation}
            type="button"
          >
            ×
          </button>
        </div>

        <nav aria-label="Primary navigation" className="app-nav">
          {navigation.map((item) => (
            <Link
              aria-current={activePath === item.href ? "page" : undefined}
              className={cn("app-nav__link", activePath === item.href && "app-nav__link--active")}
              href={item.href}
              key={item.href}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="app-sidebar__footer">
          <div className="sandbox-note">
            <Icon name="spark" />
            <span>Educational simulation. Not financial advice.</span>
          </div>
          <span className="build-label">MVP foundation / Day 2</span>
        </div>
      </aside>

      {isNavigationOpen ? (
        <button aria-label="Close navigation" className="nav-scrim" onClick={closeNavigation} type="button" />
      ) : null}

      <div className="app-frame">
        <header className="app-topbar">
          <button
            aria-controls="ripplelab-sidebar"
            aria-expanded={isNavigationOpen}
            aria-label="Open navigation"
            className="mobile-nav-toggle"
            onClick={() => setIsNavigationOpen(true)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <div className="app-topbar__context">
            <p>RippleLab workspace</p>
            <span>India MVP - prototype data only</span>
          </div>
          <div className="app-topbar__status">
            <span aria-hidden="true" className="status-pulse" />
            <span>Design system ready</span>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
