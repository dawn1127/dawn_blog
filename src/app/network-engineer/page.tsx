import Link from "next/link";
import { redirect } from "next/navigation";
import { NetworkEngineerShell } from "@/components/network-engineer-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { networkEngineerNavItems } from "@/lib/network-navigation";

export default async function NetworkEngineerPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <NetworkEngineerShell>
      <main className="network-overview">
        <div className="network-overview-hero">
          <p className="portal-kicker">Network Engineer</p>
          <h1>Network Engineer 工作區</h1>
          <p>AI Chat 先提供通用對話入口，Network PM Automation 作為下一個工具入口。</p>
        </div>

        <section className="portal-sections network-tool-sections" aria-label="Network Engineer tools">
          <div className="portal-section-head">
            <span>Tools</span>
            <p>選擇要進入的工具。</p>
          </div>
          <div className="portal-section-list">
            {networkEngineerNavItems.map((item) => (
              <Link className="portal-section-item" href={item.href} key={item.id}>
                <span>{item.label}</span>
                <p>{item.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </NetworkEngineerShell>
  );
}
