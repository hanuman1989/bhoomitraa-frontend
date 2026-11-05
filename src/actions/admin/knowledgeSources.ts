"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/dal";
import { handleActionError } from "@/lib/api/handleActionError";
import { knowledgeSourcesAPI } from "@/lib/apis/admin/knowledgeSources";
import type { ActionResult } from "@/types/api";
import {
  sourceTypes,
  identifierTypes,
  type KnowledgeSource,
  type KnowledgeSourcePayload,
  type KnowledgeSourceAttachment,
  type KnowledgeSourceReviewPayload,
} from "@/types/admin/knowledgeSource";

function validId(id: number) {
  if (!Number.isSafeInteger(id) || id < 1)
    throw new Error("Invalid identifier");
}

function invalidate(id?: number) {
  revalidatePath("/[locale]/admin/knowledge-sources", "page");
  if (id !== undefined) {
    revalidatePath("/[locale]/admin/knowledge-sources/[id]/edit", "page");
    revalidatePath("/[locale]/admin/knowledge-sources/[id]", "page");
  }
}

export async function saveKnowledgeSource(
  id: number | null,
  values: KnowledgeSourcePayload,
): Promise<ActionResult<KnowledgeSource>> {
  const t = await getTranslations("knowledgeSources");
  try {
    await requireAdmin();
    if (id !== null) validId(id);
    // Explicit allowlist prevents metadata edits from changing reviewer-owned fields.
    if (
      !values ||
      typeof values.title !== "string" ||
      typeof values.publisher !== "string" ||
      !sourceTypes.includes(values.source_type) ||
      (values.identifier_type !== null &&
        !identifierTypes.includes(values.identifier_type))
    ) {
      return { success: false, message: t("invalidInput") };
    }
    const payload: KnowledgeSourcePayload = {
      title: values.title,
      publisher: values.publisher,
      source_type: values.source_type,
      language: values.language,
      source_url: values.source_url,
      published_at: values.published_at,
      publication_year: values.publication_year,
      identifier_type: values.identifier_type,
      reference_identifier: values.reference_identifier,
      description: values.description,
      license_notes: values.license_notes,
    };
    const response =
      id === null
        ? await knowledgeSourcesAPI.create(payload)
        : await knowledgeSourcesAPI.update(id, payload);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("saveFailed") };
    invalidate(response.data.id);
    return {
      success: true,
      message: response.message || t("saved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<KnowledgeSource>(error, t("saveFailed"));
  }
}

export async function reviewKnowledgeSource(
  id: number,
  values: KnowledgeSourceReviewPayload,
): Promise<ActionResult<KnowledgeSource>> {
  const t = await getTranslations("knowledgeSources");
  try {
    const admin = await requireAdmin();
    validId(id);
    if (!admin.is_super_user)
      return { success: false, message: t("forbidden") };
    if (
      !values ||
      !["verify", "reject", "outdate", "reopen"].includes(values.action)
    )
      return { success: false, message: t("invalidInput") };
    const response = await knowledgeSourcesAPI.review(id, {
      action: values.action,
      review_notes: values.review_notes,
      rejection_reason: values.rejection_reason,
      ...(values.action === "verify" && {
        next_review_at: values.next_review_at,
      }),
    });
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate(id);
    return {
      success: true,
      message: response.message || t("actionSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<KnowledgeSource>(error, t("actionFailed"));
  }
}

export async function setKnowledgeSourceStatus(
  id: number,
  active: boolean,
): Promise<ActionResult<KnowledgeSource>> {
  const t = await getTranslations("knowledgeSources");
  try {
    await requireAdmin();
    validId(id);
    if (typeof active !== "boolean")
      return { success: false, message: t("invalidInput") };
    const response = await knowledgeSourcesAPI.status(id, active);
    if (!response.status || !response.data?.id)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate(id);
    return {
      success: true,
      message: response.message || t("actionSaved"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<KnowledgeSource>(error, t("actionFailed"));
  }
}

export async function deleteKnowledgeSource(id: number): Promise<ActionResult> {
  const t = await getTranslations("knowledgeSources");
  try {
    await requireAdmin();
    validId(id);
    const response = await knowledgeSourcesAPI.delete(id);
    if (!response.status)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate(id);
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("actionFailed"));
  }
}

export async function uploadKnowledgeSourceAttachment(
  id: number,
  formData: FormData,
): Promise<ActionResult<KnowledgeSourceAttachment[]>> {
  const t = await getTranslations("knowledgeSources");
  try {
    await requireAdmin();
    validId(id);
    const files =
      formData instanceof FormData ? formData.getAll("attachments[]") : [];
    // One file per request keeps memory and action body size bounded. UI queues up to ten.
    if (
      files.length !== 1 ||
      files.some(
        (file) =>
          !(file instanceof File) ||
          file.size === 0 ||
          file.size > 10 * 1024 * 1024 ||
          file.name.length > 255 ||
          !/\.(pdf|docx|xlsx)$/i.test(file.name),
      )
    )
      return { success: false, message: t("attachments.invalidFiles") };
    const data = new FormData();
    for (const file of files) data.append("attachments[]", file);
    const response = await knowledgeSourcesAPI.upload(id, data);
    if (
      !response.status ||
      !Array.isArray(response.data) ||
      response.data.length === 0
    )
      return {
        success: false,
        message: response.message || t("attachments.uploadFailed"),
      };
    invalidate(id);
    return {
      success: true,
      message: response.message || t("attachments.uploaded"),
      data: response.data,
    };
  } catch (error: unknown) {
    return handleActionError<KnowledgeSourceAttachment[]>(
      error,
      t("attachments.uploadFailed"),
    );
  }
}

export async function deleteKnowledgeSourceAttachment(
  id: number,
  attachment: number,
): Promise<ActionResult> {
  const t = await getTranslations("knowledgeSources");
  try {
    await requireAdmin();
    validId(id);
    validId(attachment);
    const response = await knowledgeSourcesAPI.deleteAttachment(id, attachment);
    if (!response.status)
      return { success: false, message: response.message || t("actionFailed") };
    invalidate(id);
    return { success: true, message: response.message || t("deleted") };
  } catch (error: unknown) {
    return handleActionError(error, t("actionFailed"));
  }
}
