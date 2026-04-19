import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDocumentMode, setDocumentMode } from "@/lib/settings";

const settingsSchema = z.object({
  documentMode: z.literal("openai_native"),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return Response.json({
    documentMode: await getDocumentMode(),
    canEdit: user.role === "admin",
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const body = settingsSchema.parse(await request.json());
  const documentMode = await setDocumentMode(body.documentMode);

  return Response.json({ documentMode });
}
