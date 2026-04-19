import Link from "next/link";
import { redirect } from "next/navigation";
import { NetworkEngineerShell } from "@/components/network-engineer-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { networkEngineerChatPath, networkEngineerPath } from "@/lib/network-navigation";

export default async function NetworkEngineerFuturePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <NetworkEngineerShell active="future">
      <main className="tool-placeholder-page">
        <section className="tool-placeholder-panel">
          <p className="portal-kicker">Network Engineer</p>
          <h1>以後再開發</h1>
          <p>新的網路工程工具會放在這個位置。</p>
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
