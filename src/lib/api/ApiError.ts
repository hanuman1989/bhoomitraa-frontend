import type { ApiValidationErrors } from "@/types/api";

/** A consistent error shape for Laravel API responses. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: ApiValidationErrors;

  constructor(message: string, status = 500, errors: ApiValidationErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}
