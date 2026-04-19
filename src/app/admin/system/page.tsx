import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { networkEngineerChatPath } from "@/lib/network-navigation";

export default async function SystemPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect(networkEngineerChatPath);
  }

  redirect("/settings?tab=system");
}
