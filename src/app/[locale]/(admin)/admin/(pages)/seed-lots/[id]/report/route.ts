import { requireAdmin } from "@/lib/auth/dal";
import { seedLotsAPI } from "@/lib/apis/admin/seedLots";
import { ApiError } from "@/lib/api/ApiError";
import { handleActionError } from "@/lib/api/handleActionError";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id < 1)
      throw new ApiError("Invalid identifier", 404);
    const file = await seedLotsAPI.report(id);
    const extension =
      file.type === "application/pdf"
        ? ".pdf"
        : file.type === "image/jpeg"
          ? ".jpg"
          : file.type === "image/png"
            ? ".png"
            : "";
    return new Response(file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="seed-lot-${id}-report${extension}"`,
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
