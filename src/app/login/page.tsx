import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const showTimeoutMessage = params.reason === "timeout";

  return (
    <main className="login-page">
      <section className="login-panel">
        <h1>Dawn Workspace</h1>
        <p>登录整个网站入口，进入 Network Engineer、Settings 等受保护区域。</p>
        {showTimeoutMessage ? (
          <p className="login-timeout-message">登录状态已因超过 10 分钟未活动而过期，请重新登录。</p>
        ) : null}
        <LoginForm />
      </section>
    </main>
  );
}
