import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AccountAdmin } from "@/components/account-admin";
import { ArtifactList } from "@/components/artifact-list";
import { DocumentSettings } from "@/components/document-settings";
import { ProviderAdmin } from "@/components/provider-admin";
import { SystemHealth } from "@/components/system-health";
import { networkEngineerChatPath } from "@/lib/network-navigation";

type SettingsTab = "artifacts" | "providers" | "system" | "documents" | "accounts";

const adminTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "artifacts", label: "Artifacts" },
  { id: "providers", label: "Provider & Models" },
  { id: "system", label: "System Health" },
  { id: "accounts", label: "Accounts" },
  { id: "documents", label: "文件" },
];

const userTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "artifacts", label: "Artifacts" },
  { id: "documents", label: "文件" },
];

function normalizeTab(tab: string | undefined, isAdmin: boolean): SettingsTab {
  const allowed = isAdmin ? adminTabs : userTabs;
  const match = allowed.find((item) => item.id === tab);

  if (match) {
    return match.id;
  }

  return isAdmin ? "providers" : "artifacts";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const isAdmin = user.role === "admin";
  const activeTab = normalizeTab(params.tab, isAdmin);
  const tabs = isAdmin ? adminTabs : userTabs;

  return (
    <main className="settings-shell">
      <aside className="chat-sidebar settings-sidebar">
        <div className="sidebar-fixed">
          <div className="sidebar-brand">
            <span className="brand-mark">SET</span>
            <span>Settings</span>
          </div>
        </div>

        <nav className="sidebar-scroll settings-tabs">
          <div className="section-label">工具設定</div>
          {tabs.map((tab) => (
            <Link
              className={`section-link ${activeTab === tab.id ? "active" : ""}`}
              href={`/settings?tab=${tab.id}`}
              key={tab.id}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        <nav className="chat-sidebar-links">
          <Link href={networkEngineerChatPath}>返回 AI Chat</Link>
        </nav>
      </aside>

      <section className="settings-main">
        <header className="settings-head">
          <div>
            <h2>設定</h2>
            <span className="settings-tool-label">工具頁</span>
            <p>
              {activeTab === "providers"
                ? "管理 provider、model 和原生文件能力。"
                : "管理聊天輸出、系統狀態和文件模式。"}
            </p>
          </div>
        </header>

        {activeTab === "artifacts" ? <ArtifactList /> : null}
        {activeTab === "providers" && isAdmin ? <ProviderAdmin /> : null}
        {activeTab === "system" && isAdmin ? <SystemHealth /> : null}
        {activeTab === "accounts" && isAdmin ? <AccountAdmin /> : null}
        {activeTab === "documents" ? <DocumentSettings /> : null}
      </section>
    </main>
  );
}
