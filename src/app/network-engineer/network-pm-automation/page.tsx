import Link from "next/link";
import { redirect } from "next/navigation";
import { NetworkEngineerShell } from "@/components/network-engineer-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { networkEngineerChatPath, networkEngineerPath } from "@/lib/network-navigation";

export default async function NetworkPmAutomationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <NetworkEngineerShell active="network-pm-automation">
      <main className="tool-placeholder-page">
        <section className="tool-placeholder-panel">
          <p className="portal-kicker">Network Engineer</p>
          <h1>Network PM Automation</h1>
          <p>這個工具會承接後續的 Network PM 自動化流程；目前先把入口和模組殼層立起來。</p>
          <div className="portal-actions">
            <Link className="portal-primary-link" href={networkEngineerChatPath}>
              回到 AI Chat
            </Link>
            <Link className="portal-secondary-link on-light" href={networkEngineerPath}>
              返回 Network Engineer
            </Link>
          </div>
        </section>
      </main>
    </NetworkEngineerShell>
  );
}
