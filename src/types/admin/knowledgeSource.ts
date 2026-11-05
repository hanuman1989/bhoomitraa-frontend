import type { PaginatedResponse } from "@/types/api";

// Values verified against Laravel KnowledgeSource and its Form Requests.
export const sourceTypes = [
  "government_publication",
  "research_paper",
  "journal_article",
  "report",
  "book",
  "manual",
  "guideline",
  "website",
  "other",
] as const;
export const identifierTypes = [
  "doi",
  "isbn",
  "issn",
  "report_number",
  "other",
] as const;
export const verificationStatuses = [
  "pending",
  "verified",
  "rejected",
  "outdated",
] as const;
export type SourceType = (typeof sourceTypes)[number];
export type IdentifierType = (typeof identifierTypes)[number];
export type VerificationStatus = (typeof verificationStatuses)[number];
export type ReviewAction = "verify" | "reject" | "outdate" | "reopen";

export interface KnowledgeSourceAttachment {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string | null;
  added_at: string | null;
}

export interface KnowledgeSourcePayload {
  title: string;
  publisher: string;
  source_type: SourceType;
  language: "en" | "hi" | null;
  source_url: string | null;
  published_at: string | null;
  publication_year: number | null;
  identifier_type: IdentifierType | null;
  reference_identifier: string | null;
  description: string | null;
  license_notes: string | null;
}

interface SourceAdmin {
  id: number;
  first_name: string;
  last_name: string;
}

export interface KnowledgeSource extends KnowledgeSourcePayload {
  id: number;
  verification_status: VerificationStatus;
  is_active: boolean;
  verified_by: number | null;
  verified_at: string | null;
  last_checked_at: string | null;
  next_review_at: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string | null;
  updated_at: string | null;
  added_at: string | null;
  attachments: KnowledgeSourceAttachment[];
  verifier?: SourceAdmin | null;
  creator?: SourceAdmin | null;
  updater?: SourceAdmin | null;
}

export interface KnowledgeSourceFormValues {
  title: string;
  publisher: string;
  source_type: SourceType | "";
  language: "en" | "hi" | "";
  source_url: string;
  published_at: string;
  publication_year: string;
  identifier_type: IdentifierType | "";
  reference_identifier: string;
  description: string;
  license_notes: string;
}

export interface KnowledgeSourcesFilterValues {
  keyword: string;
  source_type: SourceType | "";
  verification_status: VerificationStatus | "";
  language: "en" | "hi" | "";
}

export interface KnowledgeSourceReviewPayload {
  action: ReviewAction;
  review_notes: string | null;
  rejection_reason: string | null;
  next_review_at?: string | null;
}

export type KnowledgeSourcesListResponse = PaginatedResponse<KnowledgeSource>;
