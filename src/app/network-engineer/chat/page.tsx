import { redirect } from "next/navigation";
import { ChatWorkspace } from "@/components/chat-workspace";
import { NetworkEngineerShell } from "@/components/network-engineer-shell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ChatPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <NetworkEngineerShell active="chat" flush>
      <ChatWorkspace isAdmin={user.role === "admin"} />
    </NetworkEngineerShell>
  );
}
