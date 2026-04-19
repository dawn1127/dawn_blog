import Link from "next/link";
import { siteNavItems } from "@/lib/network-navigation";

const portalSections = siteNavItems.filter((item) => item.id !== "home");

export default function HomePage() {
  return (
    <main className="portal-page">
      <section className="portal-hero portal-home-hero">
        <div className="portal-hero-copy">
          <p className="portal-kicker">Dawn Workspace</p>
          <h1>把對話、網路工程和下一個工具放在同一個入口。</h1>
          <p>從這裡進入 Dawn Blog、Network Engineer 工作區，或保留中的新板塊。</p>
          <div className="portal-actions">
            <Link className="portal-primary-link" href="/network-engineer">
              進入 Network Engineer
            </Link>
            <Link className="portal-secondary-link" href="/blog">
              閱讀 Dawn Blog
            </Link>
          </div>
        </div>
      </section>

      <section className="portal-sections" aria-label="主要板塊">
        <div className="portal-section-head">
          <span>Sections</span>
          <p>選一個入口開始。</p>
        </div>
        <div className="portal-section-list">
          {portalSections.map((section) => (
            <Link className="portal-section-item" href={section.href} key={section.href}>
              <span>{section.label}</span>
              <p>{section.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
