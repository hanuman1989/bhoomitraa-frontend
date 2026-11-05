import { requireAdmin } from "@/lib/auth/dal";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachment: string }> },
) {
  try {
    await requireAdmin();
    const values = await params;
    const id = Number(values.id);
    const attachmentId = Number(values.attachment);
    if (
      !Number.isSafeInteger(id) ||
      id < 1 ||
      !Number.isSafeInteger(attachmentId) ||
      attachmentId < 1
    )
      throw new ApiError("Invalid identifier", 404);
    const source = await knowledgeSourcesAPI.show(id);
    const attachment = source.status
      ? source.data?.attachments.find((file) => file.id === attachmentId)
      : undefined;
    if (!attachment) throw new ApiError("Attachment not found", 404);
    const file = await knowledgeSourcesAPI.downloadAttachment(id, attachmentId);
    // Use only an encoded filename and never expose backend storage paths.
    const filename = encodeURIComponent(attachment.file_name).replace(
      /['()*]/g,
      (character) => `%${character.charCodeAt(0).toString(16)}`,
    );
    return new Response(file, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="document"; filename*=UTF-8''${filename}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: unknown) {
    const result = await handleActionError(error);
    return Response.json(
      { message: result.message },
      {
        status: error instanceof ApiError ? error.status : 500,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
