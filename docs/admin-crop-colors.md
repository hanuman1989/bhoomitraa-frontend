# Admin crop color implementation

## Result

Admin Crop Manager supports an optional, language-independent `crop_color` when creating and editing crops. Administrators can use the native picker or enter a six-digit HEX code, preview the color, and clear it. New crops start with no assigned color.

The crop table has a Color column with a bordered swatch and textual HEX code, or a translated neutral placeholder. Crop varieties can show their parent crop's assigned color beneath the existing crop badge. No separate Crop Details route, drawer, or modal exists in this repository; the existing edit page shows the saved color and preview.

## Form and picker behavior

- `ColorPicker` is a reusable controlled component using existing Label and Input components, native `input[type=color]`, and the shared ColorSwatch. No dependency was added.
- The React Hook Form value is `string | null`. It can temporarily hold an incomplete text draft, which fails validation and cannot submit. The native picker and preview retain the last valid selection while the administrator finishes typing.
- The native input's temporary black display value is never emitted or saved automatically. The visible preview remains neutral until a color is assigned.
- Manual empty text and Clear color produce null. External resets clear stale previews; edit defaults load the API color. The existing editor's record-specific React key continues to isolate different records.
- CropBasicFields validates optional null or exactly seven characters matching `/^#[0-9A-Fa-f]{6}$/`. The explicit length check also rejects trailing newlines. Case is preserved. Invalid colors never become a default.
- Server `crop_color` errors appear under the field. Failed saves retain the draft; successful edit resets use the authoritative response color. Successful creates reset to null.
- Controls and handlers respect pending saves. Labels, descriptions, validation focus, textual values, light/dark borders and wrapping layouts support accessibility and responsive use.
- Every CSS color is validated before applying `backgroundColor`; invalid API values receive the neutral presentation.
- Existing configured-language translation groups, image replacement/removal/Undo, publication settings, AI permissions, filters, pagination, notifications and row actions remain in place.

## Backend contract verified

Read-only inspection of the adjacent Laravel application verified `Route::apiResource('crops', CropController::class)` under the existing admin authentication and `can:manage-crops` group, its request classes, persistence logic, model fillable fields, resource, and middleware.

| Operation              | Existing contract                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| List / show            | GET `/admin/crops` and `/admin/crops/{id}`; CropResource returns `crop_color`                                          |
| Create                 | POST `/admin/crops`; response 201 with existing status/data/message envelope                                           |
| Update                 | PATCH `/admin/crops/{id}` for JSON; existing POST plus `_method=PATCH` for multipart; response 200                     |
| Validation             | Optional, nullable string, maximum 7 characters, six-digit HEX; existing field-error handling                          |
| Assign / replace       | Top-level string `crop_color`, outside translations                                                                    |
| Clear using JSON       | Explicit `crop_color: null`                                                                                            |
| Clear with an image    | Explicit empty multipart `crop_color` field; verified Laravel ConvertEmptyStringsToNull middleware converts it to null |
| Preserve omitted value | `undefined` is omitted from both payload formats; Laravel preserves the existing value                                 |

The existing Server Action → cropsAPI → apiRequest path, authentication, envelope and image transport are preserved. Color joins the action's writable-field allowlist. It is never appended as the literal string `"null"`. The backend remains authoritative for validation and persistence. No backend, environment, endpoint, HTTP-client or database changes were needed.

## State and cache

The crop action still invalidates the existing crop list and edit page patterns only after successful persistence. It returns the complete authoritative Crop. Failed mutations do not invalidate or update the persisted record.

Related crop options load through existing authenticated server reads/actions and `apiRequest`'s `no-store` behavior. Their mappings now retain color; no new cache, global state, optimistic update, repeated lookup or broad invalidation was introduced.

## Files created

| File                                          | Purpose                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/components/admin/form/ColorPicker.tsx`   | Nullable picker, editable HEX draft, preview, clear action, disabled and accessible states                                |
| `src/components/admin/common/ColorSwatch.tsx` | Shared safe swatch, textual code/placeholder and HEX guard                                                                |
| `tests/cropColors.test.cjs`                   | Picker, validation, safe styling, listing, related indicator and translation checks using existing Node/VM infrastructure |
| `docs/admin-crop-colors.md`                   | Contract, implementation, file inventory and validation report                                                            |

## Files modified

Paths in the first four rows are relative to `src/app/[locale]/(admin)/admin/(pages)/`.

| File                                               | Purpose                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `crops/_components/CropBasicFields.tsx`            | One RHF Controller field with optional HEX validation and translated error/helper text                 |
| `crops/_components/CropForm.tsx`                   | Create/edit defaults, payload, field errors, pending state and authoritative reset                     |
| `crops/_components/CropsList.tsx`                  | Color column preserving existing table behavior                                                        |
| `crop-varieties/_components/CropVarietiesList.tsx` | Small parent-crop color indicator with textual HEX when assigned                                       |
| `src/components/admin/form/input/InputField.tsx`   | Declare the ref already forwarded to the native input, enabling typed RHF validation focus             |
| `src/actions/admin/crops.ts`                       | Allowlist color; retain explicit null and omission for JSON and multipart                              |
| `src/lib/apis/admin/cropStages.ts`                 | Preserve color in paginated crop option mapping                                                        |
| `src/lib/apis/admin/cropStageTimelines.ts`         | Preserve color in crop search/selection and seed summary mappings                                      |
| `src/types/admin/crop.ts`                          | Response string/null, optional request field and nullable form draft                                   |
| `src/types/admin/cropVariety.ts`                   | Optional parent-crop response metadata                                                                 |
| `src/types/admin/cropStage.ts`                     | Parent-crop response and option metadata                                                               |
| `src/types/admin/cropStageTimeline.ts`             | Parent-crop response and shared option metadata                                                        |
| `src/types/admin/cropActivityTemplate.ts`          | Parent-crop response metadata                                                                          |
| `src/types/admin/cropSeedRate.ts`                  | Parent-crop color and nested crop contract                                                             |
| `src/types/admin/cropYieldBenchmark.ts`            | Include inherited color metadata, also inherited by fertilizer recommendations                         |
| `src/types/admin/seed.ts`                          | Parent-crop response metadata                                                                          |
| `src/types/admin/seedLot.ts`                       | Retain color in embedded seed summary type                                                             |
| `src/types/admin/seedPrice.ts`                     | Retain color in embedded seed summary type                                                             |
| `src/types/admin/farmerSmartTimeline.ts`           | Preserve color in the admin timeline preview's selection response type                                 |
| `src/messages/en.json`                             | Crop label/column/helper/validation and reusable picker text                                           |
| `src/messages/hi.json`                             | Matching Hindi keys and interpolation                                                                  |
| `tests/crops.test.cjs`                             | JSON/multipart assignment, null, omission, authoritative response, cache and validation-error coverage |
| `tests/adminFormState.test.cjs`                    | Color defaults/reset, different records, unrelated updates, server errors and removal retry            |
| `tests/cropStages.test.cjs`                        | Confirm pagination and labels also preserve assigned/null colors                                       |
| `tests/cropStageTimelines.test.cjs`                | Confirm crop search, saved selection and seed metadata retain colors                                   |

## Related admin review

Reviewed Crop Categories, Varieties, Growth Stages, Stage Timelines, Activity Templates, Seed Rates, Yield Benchmarks, Fertilizer Recommendations, Seeds, Seed Lots, Seed Prices, the admin Smart Timeline preview and Dashboard. Verified the related Laravel resource metadata before extending response contracts. Conditional relationship metadata remains optional where Laravel can omit unloaded relationships. Colors remain owned by crops; dependent mutation payloads do not acquire a separate color field.

The Crop API client already forwards typed payloads and full responses without rebuilding them, so it required no behavioral change. Variety relation search likewise returns the original crop response. Shared timeline option mapping covers its existing dependent module consumers.

No crop-color-specific import/export, configurable table columns or independent cached crop store exists. The dashboard displays summary counts rather than individual crop colors. No additional implemented admin Farm Crop Cycles, Farmer Management, crop reports or farming-calendar display needed color changes. Farmer-facing pages and components were not modified.

## Checks actually run

| Check                                                                                                               | Result                                                                                       |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `npx.cmd tsc --noEmit`                                                                                              | Passed                                                                                       |
| `npm.cmd run build`                                                                                                 | Passed: compilation, TypeScript and all 237 generated pages                                  |
| ESLint on every changed TypeScript/TSX/CJS file                                                                     | Passed                                                                                       |
| `node --test tests/cropColors.test.cjs tests/crops.test.cjs tests/cropStageTimelines.test.cjs`                      | 43 passed, 0 failed                                                                          |
| Focused crop form, image, translation, record-default and stage-option tests from `adminFormState` and `cropStages` | 17 passed, 0 failed                                                                          |
| Broader related-module run across 14 test files                                                                     | 230 passed, 1 existing seed-table assertion failed (expected 9 columns; current table has 8) |
| Full `adminFormState` and `cropStages` coverage during implementation                                               | Existing variety-test mock and stage-table assertions failed, described below                |
| `npm.cmd run lint`                                                                                                  | 6 existing errors in untouched files, described below                                        |
| `git diff --check`                                                                                                  | Passed                                                                                       |

The first sandboxed build could not access the installed SWC native cache. Running the same command with approved normal-user access passed without changing dependencies or configuration.

The three existing test failures were reproduced using the original tests from the starting revision `8d21ec4`: the variety form test lacks a `useSearchParams` mock; the stage list test still expects crop badges; and the seed table test expects nine columns instead of eight. Their corresponding application components were not changed by this task.

Full-project lint reports existing `react-hooks/set-state-in-effect` errors in SidebarContext, ThemeContext (two) and AppSidebar, plus `@next/next/no-assign-module-variable` in the farmer InfoWindow and Farm Manager tests. Those files are outside this change.

## Limits

No live browser or authenticated Laravel save was exercised. UI interactions and transport were verified with the repository's Node tests; Laravel behavior was verified by reading its actual routes, requests, controller, resources, middleware and existing color tests. Native color-dialog appearance and visual layouts still need a manual browser check in the deployed environment. No backend compatibility issue was found in the inspected implementation.
