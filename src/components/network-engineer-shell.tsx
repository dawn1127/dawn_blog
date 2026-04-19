import Link from "next/link";
import type { ReactNode } from "react";
import { networkEngineerNavItems, type NetworkEngineerNavId } from "@/lib/network-navigation";

type NetworkEngineerShellProps = {
  active?: NetworkEngineerNavId;
  children: ReactNode;
  flush?: boolean;
};

export function NetworkEngineerShell({ active, children, flush = false }: NetworkEngineerShellProps) {
  return (
    <div className={`network-shell ${flush ? "flush" : ""}`}>
      <aside className="network-rail" aria-label="Network Engineer 功能導航">
        <div className="network-rail-head">
          <span className="network-rail-kicker">Network Engineer</span>
          <strong>功能頁</strong>
        </div>
        <nav className="network-rail-nav">
          {networkEngineerNavItems.map((item) => (
            <Link
              aria-current={active === item.id ? "page" : undefined}
              className={`network-rail-link ${active === item.id ? "active" : ""}`}
              href={item.href}
              key={item.id}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="network-workspace">{children}</div>
    </div>
  );
}
