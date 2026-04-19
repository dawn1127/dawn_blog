import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ArtifactsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect("/settings?tab=artifacts");
}
