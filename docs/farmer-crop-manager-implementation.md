# Farmer Crop Manager implementation

Implemented in the existing `/account/crops` route and persistent dashboard bottom panel. The attached screenshots guide the green selection cards, summary cards, listing, six-step dialog, supporting selection dialogs, and review layout. No dependencies, route groups, authentication systems, global styles, environment files, or shared HTTP-client behavior were changed.

## Delivered functionality

- Backend-paginated active, draft, and historical crop lists; search, season/farm filters, real summary counts, row selection, locate, details, and supported actions.
- Six separate React Hook Form step components: crop selection, boundary, seed/sowing, soil assessment, fertilizer planning, and review.
- Persistent step saves using the returned cycle ID, revision, progress, and next step. Initial creation uses an idempotency key. Failed requests preserve editable inputs and report Laravel field errors.
- Draft resume and close/keep/discard confirmation. Active edits use Laravel's pending edit state; discarding edits does not cancel the live crop. Explicit reload confirmation protects unsaved input after a revision conflict.
- Other Season and paginated crop/seed/fertilizer catalogue dialogs, temporary selection, and cancellation without applying changes. Incompatible seed varieties are disabled.
- Independent crop geometry from the map endpoint, above the existing farm layer; selected crop highlighting; a custom Crop InfoWindow sharing the existing overlay foundation.
- Farm planting opens the wizard with its farm preselected. Farm history opens Crop Manager with farm/history filters. Crop InfoWindow links to details, editing, soil, fertilizer, parent farm, and confirmed cancellation.
- Shared manual/GPS boundary editor, read-only parent/occupied crop overlays, full-farm availability checks, manual-area fallback, containment/overlap previews, parcel/interior-ring selection, and server topology validation.
- Seed suggestions and regional packages, custom/unknown quantities, local-calendar sowing date, saved maturity estimates, purchase previews, and optional declared costs.
- Basic soil questions, laboratory values and units, additional nutrients, private report upload/download, staged report removal, optional expense, and persisted skipping.
- Backend nutrient requirements and compatible fertilizer products, manually entered product quantities, package prices, multiple selections, declared costs, known subtotals, and persisted skipping.
- Authoritative review, editable sections, crop map preview, expense states, regional expected yield, and final crop activation. The approved final button label is retained, accompanied by a clear explanation that activity timelines are unavailable.
- English/Hindi messages, light/dark styles, responsive grids, scrollable dialog bodies, fixed dialog controls, keyboard-accessible selections, and collapsible crop drawing tools on small screens.

## Files

Created:

- `src/types/account/farmCrop.ts`
- `src/lib/apis/account/farm-crops.ts`
- `src/actions/account/farm-crops.ts`
- `src/components/common/maps/CropInfoWindow.tsx`
- `src/app/[locale]/(account)/account/(protected)/crops/_components/`: `CropManager`, `CropSummaryCards`, `CropListItem`, `CropWizardDialog`, `CropWizardStepper`, `CropSelectionStep`, `CropBoundaryStep`, `SeedSowingStep`, `SoilAssessmentStep`, `FertilizerPlanningStep`, `CropReviewStep`, `ProductSelectionDialog`, `SeasonSelectionDialog`, `CropDetailsDialog`, `CropDeleteConfirm`, `CropConfirmDialog`, `CropUi`, and `cropFilters`.
- `tests/farmerCrops.test.cjs`
- This report.

Modified:

- Existing crops `page.tsx` for localized server loading and feature composition.
- Dashboard `AccountDashboardShell.tsx`, `AccountFarmContext.tsx`, `DashboardMap.tsx`, `dashboardState.ts`, and `farmGeometry.ts` for crop workspace callbacks, independent selection/layers, and allocation checks.
- Shared `FarmBoundaryEditor.tsx` and `FarmBoundaryMap.tsx` for optional crop reference layers, complete geometry display, and collapsible tools.
- `useFarmBoundary.ts` for actual recording duration and loading a selected saved boundary ring; the existing geolocation subscription remains shared.
- `FarmInfoOverlay.tsx` and `FarmInfoWindow.tsx` for reusable card content and supported farm actions.
- `src/messages/en.json` and `hi.json`.
- Existing farm/dashboard test harnesses for the additional crop dependencies/layer and GPS timer; farm behavior assertions remain in place.

Reused the existing Google Maps loader, viewport/focus helpers, map palette, overlay host, farm workspace, boundary editor, GPS hook, area-unit configuration, admin Input control, pagination, Headless UI dialogs, React Hook Form, React Hot Toast, account DAL, and `apiRequest()`.

## Verified backend integration

Routes, controller logic, model behavior, resources, configuration, and the farmer-crop migration were inspected in the adjacent Laravel repository. This is source-contract verification; no live database migration or authenticated end-to-end API run was performed.

All paths below are relative to the configured API base:

| Method | Path                                                                                                                                                                                             | Use                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| GET    | `/account/farm-crops`                                                                                                                                                                            | Paginated listing/search/filters                 |
| GET    | `/account/farm-crops/summary`                                                                                                                                                                    | Counts and active cultivated area                |
| GET    | `/account/farm-crops/map`                                                                                                                                                                        | All applicable active crop geometries            |
| POST   | `/account/farm-crops`                                                                                                                                                                            | Idempotent initial selection/draft               |
| GET    | `/account/farm-crops/{id}`                                                                                                                                                                       | Saved working state/resume/details               |
| PUT    | `/account/farm-crops/{id}/step-1`                                                                                                                                                                | Selection updates                                |
| PUT    | `/account/farm-crops/{id}/step-2`                                                                                                                                                                | Boundary/area                                    |
| PUT    | `/account/farm-crops/{id}/step-3`                                                                                                                                                                | Seed/sowing/purchase planning                    |
| POST   | `/account/farm-crops/{id}/step-4`                                                                                                                                                                | Multipart soil assessment/report                 |
| PUT    | `/account/farm-crops/{id}/step-5`                                                                                                                                                                | Fertilizer selection or skip                     |
| GET    | `/account/farm-crops/{id}/seed-recommendation`                                                                                                                                                   | Seed requirement for the working cycle           |
| GET    | `/account/farm-crops/{id}/fertilizer-recommendation`                                                                                                                                             | Nutrients and compatible products                |
| GET    | `/account/farm-crops/{id}/review`                                                                                                                                                                | Current review, validation, expenses, yield      |
| POST   | `/account/farm-crops/{id}/finalize`                                                                                                                                                              | Activate/finalize pending edits                  |
| DELETE | `/account/farm-crops/{id}`                                                                                                                                                                       | Delete draft or cancel active crop               |
| DELETE | `/account/farm-crops/{id}/edit-draft`                                                                                                                                                            | Discard pending active edits                     |
| GET    | `/account/farm-crops/{id}/soil-report`                                                                                                                                                           | Authenticated private binary download            |
| GET    | `/account/farms/{farmId}/crop-boundaries`                                                                                                                                                        | Farm occupancy and availability                  |
| GET    | `/account/seasons`, `/account/crop-categories`, `/account/crops/list`, `/account/crop-varieties`, `/account/seeds`, `/account/fertilizers`, `/account/seed-prices`, `/account/fertilizer-prices` | Existing catalogues and regional package options |

Each Server Action authenticates with `requireUser()`. Feature clients use only `apiRequest()` with the web audience. Shared error handling retains Next.js control-flow exceptions, safe messages, and validation errors. Successful activation/removal revalidates the crop route and refreshes the client workspace.

## Contract details and limitations

- Active edits have no separate begin-edit endpoint: the first successful step mutation creates the pending edit. The map endpoint continues to return live active geometry until finalization.
- The detail endpoint returns the working copy when pending edits exist. Read-only details explicitly identify pending edits rather than presenting them as finalized live data.
- History accepts one status per request. The History tab offers Completed/Cancelled filtering with the backend's original pagination; it does not merge independently paginated lists.
- Deleting an active cycle cancels it and preserves history. Only draft deletion is permanent. Historical rows expose read-only operations.
- Edit-draft discard requires a revision. It is sent in query parameters because the shared client prohibits DELETE bodies, and Laravel reads the query value.
- Sowing codes are `broadcasting`, `line_sowing`, `transplanting`, `drilling`, and `dibbling`. Variety and sowing method are nullable under the actual selection contract.
- Boundary sources are `farm_boundary`, `manual`, `gps`, and `manual_area`. MySQL remains authoritative for topology and competing allocations. The backend restricts multipart parcels/holes on MariaDB; SQLite does not support spatial allocations. These backend errors remain recoverable in the editor.
- Regional recommendation/price requests use the selected farm/cycle, never the farmer profile's region. Seed-price browsing before seed save uses `farm_id` and the selected `seed_id`, avoiding the endpoint's preference for an already-saved cycle seed.
- The crop catalogue prohibits season filtering. The frontend sends the required `is_recommendate=true` request without inventing a seasonal catalogue filter.
- Fertilizer product quantities are explicitly unavailable (`suggested_product_quantities: null`); manual quantities are supported. Laboratory nutrient interpretation and an application activity schedule are unavailable. The UI explains this and displays only actual backend advisory notes.
- Unknown prices/yield stay unavailable. Explicit zero, not applicable, skipped, and unknown expenses remain distinct. Review totals and expected production come from Laravel.
- Soil reports allow PDF/JPEG/PNG/WebP up to 10 MB. Notes use the actual 2,000-character backend limit. Report removal is staged until a successful save; files stay out of Redux/browser storage.
- No crop activity timeline is generated, no timeline endpoint is called, and no unimplemented timeline route is used.
- The existing unsupported farm-delete InfoWindow action remains disabled. No farm-delete API was invented.

## Verification

- `npx.cmd tsc --noEmit`: passed.
- Targeted ESLint for the feature, affected application files, and new crop/dashboard checks: passed.
- Production build: passed with installed Next.js 16.4.3. Windows SWC cache access required running the build outside the sandbox. No dependency or configuration change was needed.
- Crop/farm/dashboard/InfoWindow regression suite: **155 passed, 0 failed**. Tests cover actual component callbacks and SDK doubles, API routing/revisions, idempotency and duplicate submits, resume, optional skip payloads, active edit discard, finalization, local dates, seed compatibility, report validation, expense states, multi-parcel/ring preservation, topology previews, map ordering/selection/cleanup, localization, and existing farm/GPS behavior.
- Full repository testing: **569 passed, 3 failed, 572 total**. The failures are in unchanged admin Crop Variety, Crop Stage, and Seed tests. The corresponding modules and test files were checked against Git and are unchanged by this feature.
- Full repository lint has six existing errors in `SidebarContext.tsx`, `ThemeContext.tsx`, `AppSidebar.tsx`, and the existing `module` variable declarations in farm test loaders. Feature application code has no remaining lint errors.
- `git diff --check`: passed.

Live browser inspection was stopped by the computer-use safeguard because it could not reliably determine the current Windows browser URL. Therefore live authenticated CRUD, real Google Maps overlay event behavior, physical-device GPS, pixel-level screenshot matching, and responsive/dark-mode appearance were **not** verified in a browser. The implementation uses the existing responsive/theme patterns and has automated component/SDK-double coverage; a browser acceptance pass remains necessary.

## Requested confirmations

| #     | Requirement                                                         | Result                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–4   | Independent farm/crop clicks, exclusive InfoWindows, multiple crops | Implemented; SDK-double selection/layer tests pass; real Maps interaction remains unverified.                                                                                             |
| 5     | Planting Crops opens the preselected farm wizard                    | Connected through the farm action callback; farm preselection is covered in component tests.                                                                                              |
| 6, 19 | Existing Farm Manager boundary/functionality preserved              | Shared options are additive; existing farm/dashboard/GPS regression tests pass.                                                                                                           |
| 7–8   | Separate step components and React Hook Form validation             | All six components are separate; input steps validate their own fields, review validates its revision submission.                                                                         |
| 9–10  | Real step saves and draft resume                                    | Implemented against the inspected Laravel contract; revision/idempotency/resume tests pass.                                                                                               |
| 11–12 | Read-only occupied geometry; edit only current crop                 | Reference layers are noneditable/nonclickable. Current-crop parcel/ring edits preserve the parent and remaining rings in regression tests.                                                |
| 13    | Existing GPS reused                                                 | Uses `useFarmBoundary()`; existing start/pause/resume/permission/unmount tests pass. Duration uses the same session and cleans its timer.                                                 |
| 14    | Selected farm regional context                                      | Passed as farm/cycle identity for server-side recommendation and price resolution.                                                                                                        |
| 15    | Optional soil/fertilizer skip                                       | Actual skip payloads are saved to their respective endpoints.                                                                                                                             |
| 16    | Backend expenses and expected yield                                 | Displayed directly from review, with incomplete/unavailable states preserved.                                                                                                             |
| 17–18 | Activation without timeline generation                              | Finalize is the only final-save operation; timeline generation remains unavailable.                                                                                                       |
| 20    | Approved screenshot appearance                                      | Main hierarchy, cards, steps, dialogs, and actions are implemented. Exact visual matching is unverified due to the browser safeguard; mapping controls retain the shared editor's design. |
