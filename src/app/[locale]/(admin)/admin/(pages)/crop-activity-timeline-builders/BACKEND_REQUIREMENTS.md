# Crop Activity Timeline Builder: Backend Requirements

Audience: Laravel backend developers. This lists only the capabilities the
builder (`/admin/crop-activity-timeline-builders`) needs but the current API
does not provide. Everything below was checked against the backend code
(controllers, form requests, models, resources) on 21 November 2026. Endpoint
names in "Suggested request" are proposals, not existing routes.

## Already supported (no backend work needed)

| Builder feature         | Existing API used                                                                                                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace data          | `GET /admin/crops/{id}`, `GET /admin/crop-stages?crop_id&status=1`, `GET /admin/crop-stage-timelines?crop_id&status=1`, `GET /admin/crop-activity-templates?crop_id`, `GET /admin/activity-categories?status=1`, `GET /admin/crop-varieties?crop_id`, `GET /admin/seasons` (all paged at `per_page=100`) |
| Quick create, duplicate | `POST /admin/crop-activity-templates` (always creates inactive)                                                                                                                                                                                                                                          |
| Section dialogs         | `GET` + `PATCH /admin/crop-activity-templates/{id}` (validates the full final state; translations merge per locale with `updateOrCreate`)                                                                                                                                                                |
| Activate / deactivate   | `PATCH /admin/crop-activity-templates/{id}/status`                                                                                                                                                                                                                                                       |
| Safe delete             | `DELETE /admin/crop-activity-templates/{id}` (409 when active or referenced)                                                                                                                                                                                                                             |

## Missing capabilities

### 1. Stage Timeline applicability resolution

- **Existing behaviour:** The Stage Timeline list returns timing, varieties and
  seasons, but omits `region_scope` and regions on the index route. No endpoint
  resolves which timeline applies to a given crop/stage/variety/season/region
  combination.
- **Missing:** Authoritative resolution per eligible context (CTB-018 to
  CTB-020): non-dominated matches, conflicts, missing coverage and provenance.
- **Suggested request:** `POST /admin/crop-activity-templates/timeline-builder/resolve`
  with `crop_id`, `crop_stage_ids[]`, `variety_scope`, `crop_variety_ids[]`,
  `season_scope`, `season_ids[]`, `region_scope`, `region_ids[]`.
- **Required response:** per stage, `windows[]` (`min`, `max`,
  `stage_timeline_ids[]`, `context_count`, sample contexts), `missing_count`,
  `conflict_count`, `total_contexts`.
- **Frontend impact:** The builder now shows every distinct active Stage
  Timeline window for a stage, with a notice that resolution is unavailable.
  "Stage timing unavailable" only means the stage has no active timeline.
- **Backend change:** Service plus endpoint; no database change.

### 2. Scheduling validation and readiness

- **Existing behaviour:** Template validation checks offsets and basis but does
  not compare fixed offsets with stage timing or report readiness.
- **Missing:** A per-template assessment: `valid`, `partial`, `outside`,
  `missing`, `conflict`, plus readiness reasons (CTB-032, CTB-044).
- **Suggested response fields** (on the template resource):
  `timing.code`, `timing.windows[]`, `readiness.configured`,
  `readiness.reasons[]`.
- **Frontend impact:** "Configured/Incomplete" and the timing-exception badge
  are currently computed from the loaded Stage Timeline windows (display only).
  Activation is still validated by Laravel.
- **Backend change:** Service and resource fields; no database change.

### 3. Pending (unscheduled) inactive drafts

- **Existing behaviour:** `schedule_type` is required, and `fixed_offsets`
  requires both offsets.
- **Missing:** Saving an inactive draft with no schedule ("Configure Scheduling
  Later", CTB-028).
- **Suggested request:** Allow `schedule_basis: "pending"` (or nullable
  schedule fields) only while `is_active` is false; reject activation.
- **Frontend impact:** The option is shown disabled with an explanation.
- **Backend change:** Validation and enum; nullable `schedule_type` column if
  pending drafts must omit it.

### 4. Timing exception justification and reconfirmation

- **Existing behaviour:** No field stores a justification or a "reconfirm
  scheduling" state.
- **Missing:** `timing_exception_reason` (text, nullable) and a reconfirmation
  flag cleared on schedule save (CTB-032, CTB-033).
- **Frontend impact:** Exceptions are flagged but no justification field is
  shown.
- **Backend change:** Two columns, validation, and a readiness rule.

### 5. Display order

- **Existing behaviour:** No ordering field on templates.
- **Missing:** `display_order` (unsigned integer, default 0) as the tie-breaker
  for equal timing (CTB-023, CTB-036).
- **Frontend impact:** Equal timings sort by record ID; the field is omitted.
- **Backend change:** Column, validation, resource field.

### 6. Bulk operations

- **Existing behaviour:** No bulk endpoint.
- **Missing:** Per-record bulk updates with outcomes (CTB-049 to CTB-051).
- **Suggested request:** `POST /admin/crop-activity-templates/bulk` with
  `ids[]`, `operation` (`features`, `smart_actions`, `priority`,
  `knowledge_sources`, `applicability`, `stage_schedule`, `clear_schedule`,
  `activate`, `deactivate`, `delete`) and `data`.
- **Required response:** `results[]` with `id`, `status`
  (`updated`/`skipped`/`failed`) and `reason`; totals.
- **Frontend impact:** Selection works; execution is disabled with a message,
  and no changes are simulated.
- **Backend change:** Endpoint and per-record transactions; no new tables.

### 7. Search across every translation and region-aware applicability filters

- **Existing behaviour:** The template list returns only the localized `title`
  and `region_scope`, without `region_ids`.
- **Missing:** Either `translations` titles and `region_ids` on list items, or
  server-side `keyword` plus "matching applicability" filters.
- **Frontend impact:** Search covers the localized title, category and stage.
  "Matching" and "Custom" compare variety/season IDs exactly and regions by
  scope only.
- **Backend change:** Resource fields or filters; no database change.

### 8. Translation configuration metadata

- **Existing behaviour:** Supported locales live in `config/languages.php`, and
  required locales in `CropActivityTemplate::REQUIRED_LOCALES`. Neither is
  exposed by the API.
- **Missing:** `GET` metadata with `supported` locales and `required` locales.
- **Frontend impact:** The builder uses the frontend's shared language catalog
  (`@/i18n/languages`) and `requiredTemplateLocales`, like the existing
  template forms. Adding a locale needs both catalogs to match.
- **Backend change:** Small read endpoint; no database change.

### 9. Creation idempotency and concurrency checks

- **Existing behaviour:** No request ID or version check on create/update.
- **Missing:** `creation_request_id` (unique) and optimistic `updated_at` or
  version checks (production architecture section).
- **Frontend impact:** Double submits are blocked in the UI only, and
  last-write-wins applies to concurrent edits.
- **Backend change:** Column plus unique index; validation.

### 10. Authorized import

- **Existing behaviour:** No import endpoint.
- **Missing:** Validated, authorized import with preview (CTB-052).
- **Frontend impact:** Import is shown disabled. Export downloads the template
  records returned by the API.
- **Backend change:** New endpoint and validation; no new tables.
