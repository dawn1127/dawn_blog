import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const folders = await getDb().conversationFolder.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json({ folders });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = createFolderSchema.parse(await request.json());
  const folder = await getDb().conversationFolder.create({
    data: {
      userId: user.id,
      name: body.name,
    },
  });

  return Response.json({ folder });
}
