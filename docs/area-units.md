# Common Farmer area units

Laravel `config/area_units.php` owns supported codes, factors, labels, definitions,
and the default. Verified the authenticated `GET /account/area-units`, Profile
personal PATCH, Farm create/update, FarmResource accessors, and Farm Summary
against the adjacent backend checkout. This feature changes no backend files.

`accountUsersAPI.areaUnits()` calls the existing `apiRequest()` with the `web`
audience. `getAreaUnits()` authenticates with `requireUser()` and keeps shared
ActionResult/error handling. `useAreaUnits()` lazily loads this metadata once in
client session memory, shares concurrent requests and successful data across
Account routes, and offers explicit retry. Failed refreshes preserve prior valid
configuration. No provider, Redux slice, HTTP client, dependency, or persistent
cache was added.

`src/lib/areaUnits.ts` supplies validated numeric parsing, metadata lookup, label
selection, factors, conversions through square metres, preference resolution, and
locale-aware display. Missing, negative, invalid, nonfinite, unsupported, zero or
negative factors never become factor 1. Zero measurements remain valid. Preview
calculations keep full numeric precision; human-readable area displays use three
decimals. Saved government-record input retains Laravel's greater-than-zero,
nine-integer-digit/three-decimal capacity. The backend remains authoritative.

`AreaUnitSelect` extends the existing TailAdmin native Select with controlled
value, ref, disabled/input attributes, accessible error/help text, backend labels
and definitions. All configured units are shown, including future codes. Generic
Bigha is never a new selectable choice. Existing unsupported values remain visible
as unresolved values with confirmation guidance.

The backend currently confirms only `ha → hectare` as a legacy alias. Generic
`bigha`, `metric`, `imperial`, and unknown preferences are not inferred. A missing
new-farm preference uses the backend default; an ambiguous preference requires a
selection. Edit uses the saved farm unit and recorded number. Defaults initialize
once, do not mark the draft dirty, and do not overwrite unsaved selections.

Changing a unit offers **Correct unit** (keep the recorded number) and, when
supported, **Convert measurement** (preserve physical area to three-decimal input
precision). Unchanged saved recorded measurements use API `area_sqm` for explicit
conversion. Legacy Bigha can be corrected from land documents without guessing a
factor or deriving the government-record unit from the polygon.

Profile Step 1 still persists immediately and updates the existing Redux user
before advancing. Its unit list and Profile display use the shared metadata.
Successful preference changes refresh only the summary. Unrelated name, location,
language and other user changes do not refresh the summary or reinitialize Maps.
Summary requests ignore stale preference/account responses and provide retry.

Farm Manager displays `total_land_area.value` and its actual returned `unit`, with
the backend's conversion/preference-resolution flags and unresolved breakdown.
It never sums the visible paginated list or relabels a fallback total as a legacy
preference. Empty totals retain `0.000`. Individual rows retain their original
recorded areas and units.

The existing spherical geometry and GPS watcher policy are preserved. Manual,
GPS, fullscreen, review, and dashboard draw-first entry points use the same
unrounded square-metre session value and shared converter. Unchanged saved
boundaries use API `actual_area_sqm`; editing resumes geometry measurement and
clearing removes the preview. Unit changes do not recalculate geometry, alter
coordinates, or overwrite recorded area. Final payloads still allowlist original
fields and geometry and exclude `area_sqm`, `actual_area_sqm`, `actual_area`, and
`actual_area_unit`. Saved responses, overlays, selection, and thumbnails follow
the existing refresh flow.

## File inventory

Created:

- `src/types/account/areaUnit.ts`
- `src/lib/areaUnits.ts`
- `src/hooks/useAreaUnits.ts`
- `src/components/common/AreaUnitSelect.tsx`
- `tests/helpers/areaUnits.cjs` (backend metadata fixture, tests only)
- `tests/areaUnits.test.cjs`
- `docs/area-units.md`

Modified:

- `src/types/account/farm.ts`, `src/lib/userAuth/types.ts`
- `src/lib/apis/account/users.ts`, `src/actions/account/users.ts`
- `src/actions/account/farms.ts`
- `src/components/admin/form/Select.tsx`
- `src/components/common/maps/BoundaryConfirmDialog.tsx`
- `src/components/common/maps/FarmBoundaryEditor.tsx`
- `src/hooks/useFarmBoundary.ts`
- Protected Account `_components/AccountDashboardShell.tsx`,
  `AccountFarmContext.tsx`, `farmGeometry.ts`
- Profile `_components/PersonalDetailsStep.tsx`, `UpdateProfileDialog.tsx`,
  `ProfileDetails.tsx`
- Farms `_components/AddFarmDialog.tsx`, `FarmInformationStep.tsx`,
  `FarmReviewStep.tsx`, `FarmManager.tsx`, `FarmList.tsx`
- `src/messages/en.json`, `src/messages/hi.json`
- `tests/accountProfile.test.cjs`, `tests/farmManager.test.cjs`,
  `tests/farmerDashboard.test.cjs`
- `docs/farm-manager.md`

## Verification

Passed 206 targeted area-unit, profile, farm, dashboard, authentication, and API
tests; TypeScript (`tsc --noEmit`), ESLint for all changed source files, Prettier,
and the production build. Regression coverage includes metadata deduplication and
retry, configured factors and future unit codes, labels/definitions, explicit
correction/conversion, draft preservation, saved square-metre attributes, manual
and GPS previews, mixed/empty/unresolved totals, preference-only refresh, and
stale summary responses.

Tests use configured metadata fixtures and mocked APIs/Maps. Live authenticated
Laravel responses and browser layout remain manual deployment checks. The
frontend uses JavaScript numbers for previews; Laravel's decimal calculations own
saved measurements. No new Google Maps API or permission is required by area
conversion.
