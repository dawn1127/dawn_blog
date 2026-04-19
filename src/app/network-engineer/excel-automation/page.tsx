import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { networkPmAutomationPath } from "@/lib/network-navigation";

export default async function LegacyExcelAutomationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(networkPmAutomationPath);
}
