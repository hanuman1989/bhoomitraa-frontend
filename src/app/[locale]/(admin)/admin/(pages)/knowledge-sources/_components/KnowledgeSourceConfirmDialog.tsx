"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Description,
} from "@headlessui/react";
import toast from "react-hot-toast";
import Label from "@/components/admin/form/Label";
import Input from "@/components/admin/form/input/InputField";
import {
  deleteKnowledgeSource,
  deleteKnowledgeSourceAttachment,
  reviewKnowledgeSource,
  setKnowledgeSourceStatus,
} from "@/actions/admin/knowledgeSources";
import type {
  ReviewAction,
  KnowledgeSource,
} from "@/types/admin/knowledgeSource";

export type SourceOperation =
  ReviewAction | "activate" | "deactivate" | "delete" | "deleteAttachment";
interface ReviewValues {
  review_notes: string;
  rejection_reason: string;
  next_review_at: string;
}

// React Hook Form calls this during validation, outside rendering.
function isFutureReviewDate(value: string) {
  return !value || new Date(`${value}T23:59:59`).getTime() > Date.now();
}

export default function KnowledgeSourceConfirmDialog({
  id,
  title,
  operation,
  attachmentId,
  onClose,
  onSuccess,
}: {
  id: number;
  title: string;
  operation: SourceOperation;
  attachmentId?: number;
  onClose: () => void;
  onSuccess?: (source?: KnowledgeSource) => void;
}) {
  const t = useTranslations("knowledgeSources");
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState("");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReviewValues>({
    defaultValues: {
      review_notes: "",
      rejection_reason: "",
      next_review_at: "",
    },
  });
  const review =
    operation === "verify" ||
    operation === "reject" ||
    operation === "outdate" ||
    operation === "reopen";
  const destructive =
    operation === "delete" || operation === "deleteAttachment";
  function submit(values: ReviewValues) {
    if (pending) return;
    setFailure("");
    startTransition(async () => {
      try {
        const result =
          operation === "delete"
            ? await deleteKnowledgeSource(id)
            : operation === "deleteAttachment" && attachmentId !== undefined
              ? await deleteKnowledgeSourceAttachment(id, attachmentId)
              : operation === "activate" || operation === "deactivate"
                ? await setKnowledgeSourceStatus(id, operation === "activate")
                : review
                  ? await reviewKnowledgeSource(id, {
                      action: operation,
                      review_notes: values.review_notes || null,
                      rejection_reason: values.rejection_reason || null,
                      ...(operation === "verify" && {
                        next_review_at: values.next_review_at
                          ? new Date(
                              `${values.next_review_at}T23:59:59`,
                            ).toISOString()
                          : null,
                      }),
                    })
                  : { success: false, message: t("invalidInput") };
        if (!result.success) {
          for (const field of [
            "review_notes",
            "rejection_reason",
            "next_review_at",
          ] as const) {
            if (result.errors?.[field]?.[0])
              setError(field, { message: result.errors[field][0] });
          }
          const message =
            result.errors?.action?.[0] ||
            result.errors?.is_active?.[0] ||
            result.message ||
            t("actionFailed");
          setFailure(message);
          toast.error(message);
          return;
        }
        toast.success(result.message || t("actionSaved"));
        onSuccess?.("data" in result ? result.data : undefined);
        onClose();
      } catch {
        setFailure(t("actionFailed"));
        toast.error(t("actionFailed"));
      }
    });
  }
  return (
    <Dialog
      open
      onClose={() => {
        if (!pending) onClose();
      }}
      className="relative z-99999"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-950/50 backdrop-blur-sm" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            className="shadow-theme-xl w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900"
            aria-busy={pending}
          >
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {t(`actions.${operation}`)}
            </DialogTitle>
            <Description className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-400">
              {t(`confirm.${operation}`, { title })}
            </Description>
            <form onSubmit={handleSubmit(submit)} className="mt-5 space-y-4">
              <fieldset disabled={pending} className="space-y-4">
                {operation === "reject" && (
                  <div>
                    <Label htmlFor="rejection-reason">
                      {t("fields.rejection_reason")} *
                    </Label>
                    <textarea
                      id="rejection-reason"
                      rows={3}
                      aria-invalid={!!errors.rejection_reason}
                      aria-describedby="rejection-reason-error"
                      className="focus:border-brand-500 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:text-white"
                      {...register("rejection_reason", {
                        required: t("validation.required"),
                        maxLength: {
                          value: 65535,
                          message: t("validation.max", { count: 65535 }),
                        },
                        validate: (value) =>
                          !!value.trim() || t("validation.required"),
                      })}
                    />
                    <p
                      id="rejection-reason-error"
                      role="alert"
                      className="text-error-600 dark:text-error-400 text-xs"
                    >
                      {errors.rejection_reason?.message}
                    </p>
                  </div>
                )}
                {review && (
                  <div>
                    <Label htmlFor="review-notes">
                      {t("fields.review_notes")}
                      {operation === "outdate" ? " *" : ""}
                    </Label>
                    <textarea
                      id="review-notes"
                      rows={3}
                      aria-invalid={!!errors.review_notes}
                      aria-describedby="review-notes-error"
                      className="focus:border-brand-500 w-full rounded-lg border border-gray-300 bg-transparent p-3 text-sm text-gray-800 focus:outline-none dark:border-gray-700 dark:text-white"
                      {...register("review_notes", {
                        maxLength: {
                          value: 65535,
                          message: t("validation.max", { count: 65535 }),
                        },
                        validate: (value) =>
                          operation !== "outdate" ||
                          !!value.trim() ||
                          t("validation.required"),
                      })}
                    />
                    <p
                      id="review-notes-error"
                      role="alert"
                      className="text-error-600 dark:text-error-400 text-xs"
                    >
                      {errors.review_notes?.message}
                    </p>
                  </div>
                )}
                {operation === "verify" && (
                  <div>
                    <Label htmlFor="next-review">
                      {t("fields.next_review_at")}
                    </Label>
                    <Input
                      id="next-review"
                      type="date"
                      aria-invalid={!!errors.next_review_at}
                      aria-describedby="next-review-error"
                      {...register("next_review_at", {
                        validate: (value) =>
                          isFutureReviewDate(value) ||
                          t("validation.futureDate"),
                      })}
                    />
                    <p
                      id="next-review-error"
                      role="alert"
                      className="text-error-600 dark:text-error-400 text-xs"
                    >
                      {errors.next_review_at?.message}
                    </p>
                  </div>
                )}
              </fieldset>
              {failure && (
                <p
                  role="alert"
                  className="bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-300 rounded-lg p-3 text-sm"
                >
                  {failure}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  data-autofocus
                  disabled={pending}
                  onClick={onClose}
                  className="focus-visible:outline-brand-500 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 focus-visible:outline-2 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                >
                  {t("cancel")}
                </button>
                <button
                  disabled={pending}
                  className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${destructive ? "bg-error-600 hover:bg-error-700 focus-visible:outline-error-500" : "bg-brand-600 hover:bg-brand-700 focus-visible:outline-brand-500"}`}
                >
                  {pending ? t("working") : t(`actions.${operation}`)}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
