import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

function safeFilename(title: string, extension: string) {
  const normalized = title.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
  return `${normalized || "artifact"}.${extension}`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ artifactId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { artifactId } = await context.params;
  const artifact = await getDb().artifact.findFirst({
    where: {
      id: artifactId,
      ownerId: user.id,
      deletedAt: null,
    },
  });

  if (!artifact) {
    return new Response("Artifact not found", { status: 404 });
  }

  const extension = artifact.type === "json" ? "json" : "md";
  const contentType = artifact.type === "json" ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8";

  return new Response(artifact.inlineContent ?? "", {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${safeFilename(artifact.title, extension)}"`,
    },
  });
}
