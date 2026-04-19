import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conversations = await getDb().conversation.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      folderId: true,
      title: true,
      lastMessageAt: true,
      createdAt: true,
    },
  });

  return Response.json({ conversations });
}
