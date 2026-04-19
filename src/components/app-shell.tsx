import Link from "next/link";
import { networkEngineerChatPath } from "@/lib/network-navigation";

type AppShellProps = {
  active: "chat" | "artifacts" | "providers" | "system";
  isAdmin: boolean;
  children: React.ReactNode;
};

export function AppShell({ active, isAdmin, children }: AppShellProps) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <h1>Network Engineer AI</h1>
        <p>內部 AI 工作台，集中處理 Chat、文件和 provider 設定。</p>
        <Link className={`nav-link ${active === "chat" ? "active" : ""}`} href={networkEngineerChatPath}>
          AI Chat
        </Link>
        <Link className={`nav-link ${active === "artifacts" ? "active" : ""}`} href="/artifacts">
          Artifacts
        </Link>
        {isAdmin ? (
          <>
            <Link className={`nav-link ${active === "providers" ? "active" : ""}`} href="/admin/providers">
              Provider Admin
            </Link>
            <Link className={`nav-link ${active === "system" ? "active" : ""}`} href="/admin/system">
              System Health
            </Link>
          </>
        ) : null}
      </aside>
      <section className="workspace">{children}</section>
    </main>
  );
}
