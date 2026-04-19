import Link from "next/link";

export default function FuturePage() {
  return (
    <main className="portal-page">
      <section className="portal-hero portal-future-hero portal-hero-compact">
        <div className="portal-hero-copy">
          <p className="portal-kicker">以後再開發</p>
          <h1>新的板塊先留一個清楚的位置。</h1>
          <p>下一個方向確定後，會從這裡展開。</p>
          <div className="portal-actions">
            <Link className="portal-primary-link" href="/">
              返回首頁
            </Link>
          </div>
        </div>
      </section>
      <section className="placeholder-section">
        <h2>Reserved</h2>
        <p>這裡目前只保留入口，不承載功能。</p>
      </section>
    </main>
  );
}
