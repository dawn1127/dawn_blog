import Link from "next/link";

export default function BlogPage() {
  return (
    <main className="portal-page">
      <section className="portal-hero portal-blog-hero portal-hero-compact">
        <div className="portal-hero-copy">
          <p className="portal-kicker">Dawn Blog</p>
          <h1>把值得留下的東西慢慢寫清楚。</h1>
          <p>文章區正在整理中。</p>
          <div className="portal-actions">
            <Link className="portal-primary-link" href="/">
              返回首頁
            </Link>
          </div>
        </div>
      </section>
      <section className="placeholder-section">
        <h2>Coming soon</h2>
        <p>之後會放個人筆記、技術整理和長期寫作。</p>
      </section>
    </main>
  );
}
