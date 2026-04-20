import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth/session";

function getLoginMessage(params: { reason?: string; error?: string }) {
  if (params.reason === "timeout") {
    return "Sign-in timed out. Please sign in again.";
  }

  if (params.error === "locked") {
    return "Too many sign-in attempts. Please try again later.";
  }

  if (params.error === "invalid") {
    return "Invalid login or password.";
  }

  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const loginMessage = getLoginMessage(params);

  return (
    <main className="login-page">
      <section className="login-panel">
        <h1>Dawn Workspace</h1>
        <p>Sign in to access the protected Dawn Workspace areas, including Network Engineer and Settings.</p>
        {loginMessage ? <p className="login-timeout-message">{loginMessage}</p> : null}
        <LoginForm />
      </section>
    </main>
  );
}
