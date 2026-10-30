/** Shared response contracts. Import explicitly wherever needed. */
export type ApiAudience = "admin" | "web" | "public";
export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiParams = Record<
  string,
  string | number | boolean | null | undefined
>;
export type ApiValidationErrors = Record<string, string[]>;

/** Common Laravel response: data can be an object, array, or null. */
export interface ApiResponse<T> {
  status: boolean;
  data: T;
  message: string;
}

/** Pagination metadata is separate from data in the provided API response. */
export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  next_page_url: string | null;
  prev_page_url: string | null;
}

/** Response for any paginated resource list. T is ONE record, not an array. */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

export interface ApiRequestOptions {
  method?: ApiMethod;
  data?: unknown;
  params?: ApiParams;
  audience?: ApiAudience;
}

/** Serialisable result returned by a mutation Server Action. */
export interface ActionResult<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ApiValidationErrors;
}

// Next.js URL search parameters
export type PageSearchParams = Record<string, string | string[] | undefined>;

// Common Server Component page props
export interface PageProps {
  searchParams: Promise<PageSearchParams>;
}
