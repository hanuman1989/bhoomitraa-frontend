# Farmer dashboard

`/account/dashboard` lives under `src/app/[locale]/(account)/account/(protected)/`.
The protected layout uses the existing `UserAuthBoundary` once and mounts a persistent, server-rendered interactive dashboard shell.
Login, registration and reset-password URLs remain unchanged. Their existing background and card are contained in `AccountAuthCard`; the account root only mounts the shared toaster.

## Google Maps setup

Use the existing `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, with billing and Maps JavaScript API enabled. Profile location resolution also requires [Geocoding API](https://developers.google.com/maps/documentation/javascript/geocoding) to be enabled and allowed by this key's API restrictions. Keep the existing Maps Static API permission used by thumbnails. Restrict the browser key to the application's website referrers. Restart development/rebuild production only if the public key changes. `.env.local` and Maps Static API configuration are unchanged.

No Maps dependency is installed. The official direct script loader is loaded once; its callback resolves a shared promise. The Maps Data layer displays GeoJSON Polygon, MultiPolygon (including holes), and location-only Point features. No drawing or deprecated Marker constructor is used. The country-level fallback center/zoom is configurable in `dashboardState.ts`; it does not represent a farmer's location.

The map remains mounted across sidebar, panel, module, FAB and resize changes. Satellite is the initial map type and the Reset Layers default. Users can switch to Roadmap; valid map-type choices survive locale changes. Map control actions do not mutate farm geometry. Fit/focus accounts for the overlaid bottom panel. Location uses a single explicit `getCurrentPosition` request, never continuous tracking.

Saved farm selection opens the shared [Farm map popup](farm-info-window.md), a
React portal in one supported OverlayView. The card replaces the native name-only
InfoWindow, preserves selection on Close, and uses original recorded area labels.
Its five menu actions are visual Coming Soon options; Farm Manager's existing
row actions remain unchanged.

The shell renders route children during server rendering so Next.js can validate instant navigations. It must not be wrapped in `dynamic(..., { ssr: false })`, which prevents child page segments from rendering during validation. Browser viewport measurements and the locale snapshot are restored after hydration, before `DashboardMap` mounts; Google Maps initialization remains inside its browser effect. The first server and hydration renders use the same loading UI without reading `window` or session storage.

Locale changes preserve the map viewport, type, selection and panel height through a one-shot, per-farmer session-storage snapshot. This contains no credentials, profile fields, farm records, active module or panel-visibility flag. The current URL owns the active module and display mode. The snapshot is consumed after mounting; Dashboard and management URLs open their corresponding panel, while the sidebar and floating actions start closed. A locale navigation may remount the map because the locale route segment changes; its viewport is restored. Google basemap labels retain the language used when the SDK first loaded until a full reload.

## Backend dependency

The account/profile and farm contracts were verified against the adjacent Laravel checkout: account routes, Auth/User/Farm controllers, UserResource, FarmerProfileResource, FarmResource, and the Farm model. The existing account-scoped `getFarmWorkspace()` action retrieves every page of `GET /account/farms?include_boundary=1` and the farm summary through `apiRequest()`. The map uses this complete workspace independently of Farm Manager search, status filters, or pagination. Its existing active/inactive visibility policy is preserved. See [Farm Manager](farm-manager.md) for Add/Edit and satellite previews.

`useUserAuth()` reads `state.webUser` and already supplies `user.farmer_profile`, including localized State/District names. The map uses that Redux data directly; it adds no Profile, `/me`, or Region request. The map-rendering `DashboardFarm` type remains distinct from the verified Laravel `Farm` resource. Workspace responses are tagged with their Farmer ID so a previous account's data is never rendered for a new account.

Dashboard summary cards and crop timelines still use the static reference values; these are not live statistics. Other unfinished modules retain their existing content. Fixtures used by tests are never rendered in production.

## Initial map viewport

The shared `DashboardMap` waits for the SDK, authenticated Redux user, completed
farm request, and a useful unobstructed map area. It then applies this order:

1. Fit the complete saved farm geography. `farmPositions()` includes every valid
   Polygon/MultiPolygon component and hole; a valid boundary takes precedence
   over its saved centroid. Location-only farms and malformed boundaries with
   valid location coordinates use the saved point. `farmLocation()` accepts
   decimal strings and zero coordinates, rejecting null, blanks, nonfinite, and
   out-of-range values. Single points use zoom 16; polygon fits have a temporary
   maximum zoom of 18 after fitting, without restricting later manual zoom.
2. When farms are successfully loaded and none has usable geography, resolve
   the Redux Profile's Village, District, and State names. Trim/deduplicate
   address components and append India; region IDs, residential address, names,
   mobile numbers, and email are never sent. The first village query omits PIN;
   PIN is used only on a subsequent disambiguation attempt. Unresolved or
   ambiguous villages fall back to District, then State. Profile zoom limits are
   15, 10, and 7 respectively, using returned geographic viewport bounds when
   available. Country, State context, result types, partial matches, and
   available address components are checked before choosing a unique result.
   Google country/administrative-area filters support transliterated names.
3. With no usable profile location or a geocoding failure, keep the existing
   `DEFAULT_MAP_VIEW` as the initial fallback. A farm API error is not an empty
   collection: retain the current view and wait for the existing retry flow.

The shared `geocodeMapAddress()` in `googleMaps.ts` is used by the dashboard and
the existing editor. The editor's original address/region request behavior is
preserved. The SDK is loaded once, and a bounded 50-entry, per-SDK memory map
deduplicates matching in-flight/resolved lookups. Nothing is persisted, and no
browser GPS permission or new location watcher is involved.

Panel height comes from the existing shell state and browser viewport; sidebar
width is measured from its actual mounted DialogPanel and monitored for resize.
RTL padding follows the document direction. Point and bounds positioning use
the unobstructed area. Automatic positioning waits while the panel covers the
map, the sidebar measurement is pending, a farm/boundary dialog is open, or a
full-page Account workflow hides the map. It never resizes/collapses the panel.

Initialization is retained across rerenders, Account routes, map-type changes,
panel resizing, and unrelated profile fields. Restored locale snapshots preserve
the user's chosen view. New Farmer/map lifecycles reset initialization, and stale
farm/profile responses cannot move a newer account/location's map. A relevant
Redux location update can recenter once when no farm geography or manual
navigation owns the view; otherwise Fit All uses the latest profile fallback.
Pointer, wheel, keyboard, zoom, focus, and Current Location actions invalidate
pending automatic work and release temporary zoom caps. Existing post-save farm
focus takes precedence over initialization. Manual/GPS drafts stay in their
existing editor sessions, whose requests/listeners are not replaced.

Changed for this viewport improvement: `DashboardMap.tsx`,
`AccountDashboardShell.tsx`, `AccountSidebar.tsx`, `mapViewport.ts`,
`farmGeometry.ts`, `googleMaps.ts`, the shared `FarmBoundaryMap.tsx` geocoder call,
`tests/farmerDashboard.test.cjs`, and this document. UI design, Redux/auth
architecture, translations, thumbnail code/configuration, and dependencies are
preserved.

Current verification: 182 targeted account/profile/API/farm/dashboard tests,
TypeScript, targeted ESLint, and the production build pass. Tests mock
SDK/geocoding responses and make no live billable Maps requests. Live geographic
accuracy, key permissions, and browser visual verification remain deployment
checks.

## Route children and the shared panel

The protected layout passes Next.js route `children` through `AccountDashboardClient` into one persistent `AccountDashboardShell`. The shell resolves the current pathname using `_config/accountModules.ts`:

| Route                                | Display mode | Content                                |
| ------------------------------------ | ------------ | -------------------------------------- |
| `/account/dashboard`                 | `panel`      | Static summary cards and crop timeline |
| `/account/farms`                     | `panel`      | Farm Manager route page                |
| `/account/crops`                     | `panel`      | Crop Manager route page                |
| `/account/irrigation`                | `panel`      | Irrigation route page                  |
| `/account/machinery`                 | `panel`      | Machinery route page                   |
| `/account/employees`                 | `panel`      | Employees route page                   |
| `/account/profile`                   | `panel`      | Profile route page                     |
| Future nested creation/detail routes | `full-page`  | Page workspace above the mounted map   |

Only exact list routes resolve as panel mode. A nested path such as `/account/farms/new` or `/account/farms/123` deliberately resolves as full-page mode, associated with its parent module for navigation highlighting. This prepares the layout; it does not create those routes or implement Add Farm.

The shared configuration owns menu order, typed identifiers, hrefs, translation keys, icons and display modes. Sidebar navigation uses the existing locale-aware router. Choosing a module closes the sidebar/FAB and navigates to its URL. The shell renders `<AccountBottomPanel>{children}</AccountBottomPanel>` for panel mode. Each page supplies its own heading. Dashboard composes its static content from `dashboard/_components/DashboardSummary.tsx` and `DashboardCropTimeline.tsx`, with English/Hindi messages and responsive light/dark styles. Crop image paths and generation prompts are documented in [farmer-dashboard-assets.md](farmer-dashboard-assets.md). The shared panel has no header or title prop. Its circular toggle sits on the right beside the resize handle and remains visible at the bottom when collapsed. It hides and reopens the same page without changing the URL, remounting the map, resetting the panel height or unmounting the page content. The visibility choice stays local and is not saved in the locale snapshot. Selecting a module in the sidebar shows its panel.

The map remains at the same position in the persistent layout tree with stable selection callbacks. Navigation does not recreate it or reconstruct unchanged polygon layers. Center, zoom, map type, selection and panel height are retained. The existing `AccountBottomPanel` and `AccountPanelResizeHandle` are reused without replacement. Height supports mouse/touch pointer capture, cancellation, frame-limited updates, Arrow Up/Down, Home and End; content scrolls independently. Near full height, floating controls are suppressed so they cannot obscure panel controls.

The authentication Redux slice and all authentication providers/actions/proxy behavior are unchanged. Dashboard interaction state contains only sidebar/FAB visibility, height, map type and selection. The unused farm-list context has been removed with the farm-list UI.

Farm Manager, Crop Manager and the other unimplemented routes use the existing translated coming-soon content; profile details live in `profile/_components/ProfileDetails.tsx`. Pages do not render maps, panels, resize handles or auth providers. The protected `loading.tsx` and `error.tsx` render within the route's content slot, keeping the shared shell and panel intact during page loading/failure. Error recovery uses the installed Next.js `retry` callback.

## Farmer Profile

Profile uses the existing shared bottom panel. The compact banner uses `/images/title-bg.png`, an initials avatar, the real account status and an email-verification badge only when `email_verified_at` is present. Location names come directly from `farmer_profile.state.name` and `farmer_profile.district.name`. Missing information displays a localized empty value.

Laravel routes, controllers, request validation and resources were inspected for these contracts:

| Endpoint                              | Writable fields / purpose                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /api/account/me`                 | Full authenticated user with loaded `farmer_profile` and location names                                       |
| `PATCH /api/account/profile/personal` | `first_name`, `last_name`, `preferred_language`, `preferred_units`                                            |
| `PATCH /api/account/profile/location` | `state_id`, `district_id`, `village`, nullable `address` and `pincode`                                        |
| `GET /api/regions`                    | Active states or direct child districts, using `region_type`, `parent_id`, `is_active`, `page` and `per_page` |

Both PATCH routes require Farmer authentication and return the complete authoritative user/profile. The existing account API client uses `apiRequest()` with the `web` audience; region reads use the verified public route with the `public` audience. Server Actions call `requireUser()`, allowlist writable fields and preserve shared error handling. Supported preferences are English/Hindi and `bigha`, `ha`, `acre`.

Next Step saves personal details before advancing and replaces Redux user data with the response. Save Changes persists location, updates Redux, shows the translated success toast and closes the portal dialog. No second `/me` request is necessary. Previous preserves both drafts; saving again resubmits Step 1. Cancelling after Step 1 keeps already saved personal details and discards unsaved location changes. Email/mobile remain read-only.

Each step also has a Skip link. Skipping personal details opens Location without validation or a save. Skipping Location closes the dialog without saving its draft, retaining any personal details already saved. A skipped personal step does not show a completion checkmark. Saved State and District values stay bound to their dropdowns while asynchronous options load or replace the initial saved options.

Region dropdowns load all response pages, clear District when State changes and ignore stale district responses. Existing saved inactive regions may remain selected; only active regions can be newly selected. Loading failures provide Retry without discarding form values. Client validation covers required fields, backend field lengths, allowed preferences and optional six-digit PIN codes. Laravel remains authoritative for ownership and region relationships.

Profile regression tests cover API contracts, authentication, error handling, partial saves, retries, duplicate submission guards, dependent regions, initials, real Redux values and matching English/Hindi messages. These are frontend tests with test doubles; live authenticated profile saves and browser layout verification require an available browser session.

## Validation limits

Unit/component tests cover route resolution, route-child placement, navigation/history URL changes, panel closing, full-page routing, state persistence, pointer and keyboard resizing, geometry, map commands/lifecycle using an SDK test double, error handling, geolocation outcomes, locale switching and account regressions. Live Google tiles and authenticated farm loading require the configuration/backend dependencies above; live farm creation is outside this task.

## Current account structure

```text
account/(protected)/
├── layout.tsx
├── loading.tsx
├── error.tsx
├── _config/accountModules.ts
├── _components/
│   ├── AccountDashboardClient.tsx
│   ├── AccountDashboardShell.tsx
│   ├── AccountBottomPanel.tsx
│   ├── AccountPanelResizeHandle.tsx
│   ├── AccountSidebar.tsx
│   ├── AccountFloatingActions.tsx
│   ├── AccountModuleUnavailable.tsx
│   ├── DashboardMap.tsx
│   └── dashboard/map state, geometry and SDK helpers
├── dashboard/
│   ├── page.tsx
│   └── _components/
│       ├── DashboardSummary.tsx
│       └── DashboardCropTimeline.tsx
├── farms/page.tsx
├── crops/page.tsx
├── irrigation/page.tsx
├── machinery/page.tsx
├── employees/page.tsx
└── profile/
    ├── page.tsx
    └── _components/
        ├── ProfileDetails.tsx
        ├── UpdateProfileDialog.tsx
        ├── ProfileStepIndicator.tsx
        ├── PersonalDetailsStep.tsx
        └── LocationDetailsStep.tsx
```

The earlier route-panel refactor added the central configuration, shared unavailable content, six module pages, the Profile component and protected loading/error boundaries. Farm Manager has since been implemented through the existing account-scoped workspace.

Modified for this refactor: `AccountDashboardShell.tsx`, `AccountSidebar.tsx`, `dashboardState.ts`, `dashboardSnapshot.ts`, English/Hindi messages, `tests/farmerDashboard.test.cjs` and this document. The protected layout already provided the correct persistent boundary and passes route children unchanged.

No Admin authentication, Farmer authentication/store/session/proxy behavior, public auth URLs, Maps key/SDK integration, polygon geometry, ResizeHandle, dependency, HTTP client or global theme changes are part of the route-panel refactor.

Validation includes 74 dashboard/account tests, TypeScript, changed-file ESLint, formatting and the production build. Rendering regressions cover route children on the server, post-hydration initialization, Strict Mode snapshot restoration and the static dashboard's English/Hindi summary/timeline content. Earlier read-only HTTP checks confirmed all seven protected account URLs redirect guests to Login, the three public auth pages keep their original headings/background, and Hindi Login renders correctly. The previous full-suite baseline was 396/397 passed, with a Seeds column-count mismatch; full ESLint had four effect-state errors in SidebarContext, ThemeContext and AppSidebar. Live browser history/navigation and Google tiles have not been verified beyond the SDK/test-runtime regression checks.
