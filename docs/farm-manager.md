# Farmer Farm Manager

`/account/farms` uses the existing persistent `AccountDashboardShell`, map, sidebar,
and resizable bottom panel. The Farm Manager follows the six supplied references:
four summary cards, searchable rows, status filter, wide four-step dialog,
manual/GPS boundary controls, and review cards beside a read-only map.

## Verified Laravel contract

Checked against the adjacent `bhoomitraa-backend` checkout: `routes/api.php`,
`Account/FarmController`, its Form Requests, `FarmResource`, the `Farm` model,
`RegionController`, `AreaHelper`, and `config/area_units.php`.

- `GET /account/farms`: server search/status/pagination; boundaries are opt-in.
- `GET /account/farms/summary`: account-wide counts and the authoritative converted government-record total in the resolved preferred unit.
- `GET /account/area-units`: configured units, English/Hindi labels, definitions, decimal factors and default unit.
- `GET /account/farms/{id}`: full editable details and boundary.
- `POST /account/farms`: one final creation request with UUID `Idempotency-Key`.
- `PATCH /account/farms/{id}` and `/boundary`: basic and boundary edits.
- `PATCH /account/farms/{id}/status`: activate/deactivate.
- `GET /regions`: public localized, paginated state/district/subdistrict hierarchy.

All backend traffic uses the existing Server Action → feature client →
`apiRequest()` architecture and Farmer cookie audience. The HTTP client, auth
providers, locale routing, and global theme are unchanged by this feature.
The backend scopes records to the authenticated Farmer. No deletion API exists;
the interface offers edit and status actions.
Basic edits and boundary edits use separate verified PATCH endpoints. If the
second request fails, the dialog explains that the basic details were saved,
keeps the boundary draft, and allows retry.

## Draft and maps

`AddFarmDialog` owns one React Hook Form draft and one `useFarmBoundary` session.
Step navigation and editor fullscreen retain the same session. Boundary drawing
does not create a farm. The dashboard FAB uses the same `FarmBoundaryEditor`
and transfers its confirmed MultiPolygon into Step 1 of the wizard.
One creation key is retained for the dialog's lifetime, including corrected
retries, so an uncertain save cannot silently create another farm with a new key.
An idempotency conflict directs the user to check the saved list.

The dialog has a definite viewport-bounded height and a narrower maximum width.
Its header, stepper and footer sit outside the scrolling content wrapper; the
fieldset keeps its natural content height inside that wrapper. Changing steps
resets only the form scroller. Existing farms expose all four step buttons from
the outset, including Review when no optional boundary is saved. All edit steps
show completed checkmarks, with the active step highlighted separately. Step
jumps do not save data or validate unrelated steps; final Save still validates every
required field and the boundary. Navigation stays locked during active GPS
recording and saves. New farms retain sequential validation, and an explicit
boundary skip is remembered when revisiting completed steps.

The shared boundary editor's fullscreen presentation fills the viewport with a
fixed mode/exit bar, a flexible map workspace, and a bounded summary region.
The GPS sidebar scrolls independently so instructions, status, tracking buttons
and the disclaimer keep their natural sizes without overlapping the summary.
Narrow screens stack the GPS sidebar and map into independently bounded rows;
wide screens place them side by side. Map minimum height is relaxed only for
this fullscreen presentation. The existing map and GPS session stay mounted
while resizing. Escape exits fullscreen, restores focus to the entry button,
and defers to any open boundary confirmation dialog.

Manual drawing uses Map click events and [editable Polygon paths](https://developers.google.com/maps/documentation/javascript/reference/polygon),
without Google DrawingManager. The existing singleton SDK loader is
reused. Editor maps default to Satellite; the dashboard preference is preserved.
Empty and incomplete boundaries render without creating a polygon. Once at
least three points are available, the polygon receives an explicit outer ring.
Path listeners are guarded and tracked on the actual MVCArray; replacing a path
removes the old listeners and subscribes to the new one. Vertex dragging keeps
the same polygon instance. Clearing, changing modes and unmounting remove those
listeners without reading an absent path. Regression tests reproduce the former
empty-path `addListener` crash and verify the corrected lifecycle.
Geocoding the selected village/regions only chooses an approximate starting view.
Geocoded coordinates are never submitted as an exact farm position. If geocoding
fails, the established India overview remains available with an explanatory notice.

Geometry uses `[longitude, latitude]`, one exterior ring, and a maximum of 499
vertices plus the closing point. Preview validation rejects invalid coordinates,
duplicates, crossing/touching edges, antimeridian crossings, and zero/unsupported
area. Spherical preview area uses an Earth radius of 6,371,008.8 metres, consistent
with Laravel's spherical fallback. Laravel validates and calculates stored values.

Government-record area remains independent. A unit change offers an explicit
correction (keep the recorded number) or, when conversion is available, conversion
of the same physical area rounded to the backend's three-decimal input precision.
The boundary stays unchanged. Live manual/GPS previews use one shared converter
and the backend's configured factors, including Kaccha/Pakka Bigha definitions.
Missing configuration or unresolved units fall back to clearly labeled square
metres for map previews. The summary uses backend aggregates rather than summing
incompatible units. See [common area units](area-units.md) for the metadata cache,
legacy policy, profile preference refresh, and calculated resource attributes.
The current backend returns `active_crop: null`; rows show a translated empty value.

## Satellite thumbnails

Farm rows use the reusable `src/components/common/maps/FarmSatellitePreview.tsx`.
The existing 80 × 56 frame, row sizing, selection and actions are preserved.
The paginated list requests `GET /account/farms?include_boundary=1`; Laravel's
`auth:user`, `abilities:frontend`, and `user.active` middleware and the controller's
Farmer relationship scope remain authoritative. No per-row details requests,
new backend endpoints, database columns, or image persistence are introduced.

The [Maps Static API](https://developers.google.com/maps/documentation/maps-static/start)
request uses satellite imagery, PNG, `size=240x168`, and `scale=2`. Google fits
the complete closed path; no fixed polygon zoom is supplied. The shared
`farmMapStyle.ts` preserves the dashboard's ID-based palette and selected green
stroke. Thumbnails use a three-pixel stroke and approximately 25% fill opacity.
The complete original image, including Google attribution, is displayed with
`object-contain` and an explicitly unoptimized Next Image. Native lazy loading
requests only rendered, visible rows; URLs remain stable across unrelated state
changes. No interactive Maps instances or JavaScript image fetches are created.

Single-exterior-ring MultiPolygon and Polygon data accepted by the dashboard are rendered.
If the list omits geometry, the matching saved workspace record supplies it without
another API request. Explicit boundary removals and newer row versions take precedence
over workspace data, and records are matched by farm ID.
Existing geometry validation checks coordinates, closure, distinct vertices,
intersections, and positive area. Unsupported components/holes or malformed
geometry use the illustration rather than an incomplete boundary. Valid saved
farm coordinates without a boundary use a location-only satellite view at zoom 17. Missing farm coordinates never fall back to the Farmer's residential location.
Large paths use Google's [encoded polyline format](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
only when raw coordinates exceed the URL budget. E5 rounding must retain valid
geometry and change area by no more than 1%; otherwise the illustration is used.
No saved coordinates or area are modified, and requests stay below 16,384 characters.

The illustration remains visible during loading and after an image error, with
localized accessible labels. Failed URLs are not retried until geometry or
appearance changes. Incorrect-size Google error images are detected on load.
Same-size error images and warning headers cannot be inspected by a direct
cross-origin image element; use Google Cloud metrics/browser network tools to
diagnose those [Google errors](https://developers.google.com/maps/documentation/maps-static/error-messages).

Configuration is documented in `.env.example`; `.env.local` is untouched:

- `NEXT_PUBLIC_GOOGLE_MAPS_STATIC_API_KEY` is preferred when supplied, otherwise
  the existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is reused. Enable Maps Static API
  and billing for its project, and apply website/referrer and API restrictions.
- Optional `GOOGLE_MAPS_STATIC_SIGNING_SECRET` stays server-only. When configured,
  server rendering and existing authenticated list/workspace actions attach
  [HMAC-SHA1 signed URLs](https://developers.google.com/maps/digital-signature)
  to UI metadata separately from the unchanged Laravel response. Workspace URLs
  allow a selected farm outside the current result page to reuse its saved data;
  generating URL strings does not request images. No public signing endpoint
  accepts arbitrary farm geometry, and no signing secret enters client props.
  An invalid signing configuration uses the illustration. Normal and selected
  variants retain the dashboard's highlight without another backend request.
- Create/edit/removal follows the existing successful-save refresh. Only saved
  API geometry is used for list thumbnails, never wizard drafts.

Cloud API enablement, key restrictions, live imagery, and visual comparison still
require verification in the running deployment. Automated tests use fake keys
and mocked image events, and make no Google Maps requests.

For a missing image request, inspect the thumbnail's `data-farm-preview` and
`data-farm-preview-reason` attributes in browser DevTools. These contain only
status codes, never API keys, request URLs, coordinates, or record identifiers.
This Console expression returns the state for each thumbnail:

```js
Array.from(document.querySelectorAll("[data-farm-preview]"), (element) => ({
  state: element.dataset.farmPreview,
  reason: element.dataset.farmPreviewReason,
}));
```

`missing-key` requires restarting/rebuilding with the public key configured;
`missing-location` requires saved farm coordinates/boundary; `invalid-boundary`
or `unsafe-encoding` indicates rejected geometry; `url-too-long` indicates the
request URL limit; `server-preview-unavailable` indicates an unavailable server
URL (signing configuration or geometry). `image-error` means the request failed,
and `unexpected-image-size` means Google returned an unexpected image. `loading`
means the URL is available but the browser has not completed loading it.

Files changed for satellite thumbnails:

- Shared maps: `FarmSatellitePreview.tsx`, `farmStaticMap.ts`,
  `farmStaticMap.server.ts`, and `farmMapStyle.ts` under
  `src/components/common/maps/`.
- Farm Manager: `farms/page.tsx`, `_components/FarmManager.tsx`, and
  `_components/FarmList.tsx` for boundary loading and preview integration.
- Saved data/color integration: `src/actions/account/farms.ts`, protected
  `_components/AccountFarmContext.tsx`, `AccountDashboardShell.tsx`, and
  `DashboardMap.tsx`.
- Configuration and translations: `.env.example`, `.gitignore`,
  `src/messages/en.json`, and `src/messages/hi.json`.
- Verification/documentation: `tests/farmManager.test.cjs`,
  `tests/farmerDashboard.test.cjs`, and this document.

## GPS

Tracking requires an explicit click, secure context, browser support, and device
permission. A session owns at most one `watchPosition` subscription. Accepted
positions must have finite valid coordinates, age no more than 30 seconds,
accuracy no worse than 50 metres, at least 2 metres spacing, and no jump exceeding
the larger of 30 metres or 15 metres/second. Traces are capped at 499 vertices.
Pause retains points; resume warns about a substantial gap. Permission errors,
timeouts, weak readings, background interruption and unavailable GPS have localized
feedback. Hidden pages pause tracking. Close, discard, finish, mode changes and
unmount clear the watcher; stale subscription callbacks are ignored.

GPS polygons can be corrected manually while keeping GPS as their capture source.
The interface describes GPS as approximate, asks users to keep the page visible,
and makes no promise of background or locked-device tracking.

## Verification

Run `node --test tests/farmManager.test.cjs tests/farmerDashboard.test.cjs
tests/accountAuth.test.cjs tests/accountProfile.test.cjs tests/apiRequest.test.cjs`,
`npx.cmd tsc --noEmit`, and a production build.

Executed verification: 155 targeted tests passed, TypeScript passed, and ESLint
passed for the changed feature files. Production compilation and prerendering
also passed. The build requires the normal user context because the sandbox
account cannot access SWC's native binding cache.

Browser visual comparison and real mobile GPS walks require manual verification:
the available computer-use service could not establish the current browser URL.
Test desktop/tablet/mobile layouts, both languages and themes, permission prompts,
live satellite loading, vertex dragging, fullscreen, and final save against the
running Laravel service. No credentials, example farms, or GPS coordinates have
been embedded in the application.

## File inventory

Created under `src/app/[locale]/(account)/account/(protected)/farms/`:

- `page.tsx`: localized server loading.
- `_components/FarmManager.tsx`: URL filters, debounce, pagination, summary and states.
- `_components/FarmList.tsx`: selection, location, edit and status controls.
- `_components/AddFarmDialog.tsx`: shared draft, validation, final submission and retry key.
- `_components/FarmStepper.tsx`: four-step navigation.
- `_components/FarmInformationStep.tsx`: government-record information and unit policy.
- `_components/FarmLocationStep.tsx`: cascading regions and profile reference.
- `_components/FarmBoundaryStep.tsx`: shared map editor integration.
- `_components/FarmReviewStep.tsx`: editable summaries and boundary preview.
- `_components/FarmIllustration.tsx`: decorative reference-style side panels.
- `_components/FarmField.tsx`: accessible field labels and errors.
- `_components/farmFormTypes.ts`: typed form values and local styles.
- `_components/farmFilters.ts`: URL query handling.
- `_components/useFarmRegions.ts`: asynchronous location loading with stale-response protection.

Other created files:

- `src/app/[locale]/(account)/account/(protected)/_components/AccountFarmContext.tsx`
- `src/components/common/maps/FarmBoundaryEditor.tsx`
- `src/components/common/maps/BoundaryConfirmDialog.tsx`
- `src/hooks/useFarmBoundary.ts`
- `src/icons/farm-wizard-landscape.svg`
- `tests/farmManager.test.cjs`
- `docs/farm-manager.md`

Modified existing files:

- Protected `_components/AccountDashboardShell.tsx`: workspace loading, shared selection and dialogs.
- Protected `_components/AccountFloatingActions.tsx`: Add Farm and Draw Farm Boundary entries.
- Protected `_components/farmGeometry.ts`: validated boundary construction and measurements.
- Protected `_components/googleMaps.ts`: supported editable-polygon type declaration.
- `src/components/common/maps/FarmBoundaryMap.tsx`: persistent editable polygons and editor controls.
- `src/actions/account/farms.ts`: complete region pagination and safe partial-edit feedback.
- `src/lib/apis/account/regions.ts`: explicit region pagination.
- `src/icons/index.tsx`: illustration export.
- `src/messages/en.json` and `src/messages/hi.json`: matching interface text.
- `tests/farmerDashboard.test.cjs`: updated integration harness and FAB draft-transfer regression.

The native farm illustration extends the repository's SVG asset approach; it is
decorative and does not represent a farm photograph or stored account data.
