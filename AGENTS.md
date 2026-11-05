<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Bhoomitraa Frontend

## Scope and priorities

These rules apply to future development throughout this frontend repository. The actual files and the user's authorized task scope take precedence over an outdated diagram or example. Implement only the requested functionality and preserve unrelated work.

- **Backend first:** verify required Laravel functionality before implementing a backend-dependent feature. Follow the blocking rule below if it cannot be verified.
- **Existing architecture first:** inspect and reuse current modules, components, types, providers, and conventions before adding code.
- **Fetch only:** backend integrations must use `apiRequest()` from `src/lib/api/request.ts`. Never introduce Axios, another HTTP client, a parallel Fetch wrapper, or independent backend `fetch()` calls elsewhere.
- **Minimal changes:** do not reorganize files, migrate existing JavaScript, replace dependencies, or refactor unrelated code as part of another feature.
- Do not modify `.env.local`, expose secrets, or log tokens, credentials, passwords, or sensitive backend responses.

## Stack and configuration

- Installed Next.js **16.4.3**, App Router, React **19.3.0**, and strict TypeScript with `allowJs` for existing `.js`/`.jsx` files.
- TailAdmin **v2.3** is the project's UI standard; reuse the existing vendored design and components rather than expecting a separate TailAdmin package.
- Installed Tailwind CSS **4.3.3** and next-intl **4.14.9**. Current locales are English (`en`) and Hindi (`hi`).
- Forms use `react-hook-form`; dialogs use `@headlessui/react`; notifications use `react-hot-toast`.
- Preserve existing Redux Toolkit/React Redux, theme/sidebar contexts, Flatpickr, React Dropzone, SimpleBar, and Swiper where relevant; do not replace them unnecessarily.
- Backend system: Laravel REST API with MySQL. Backend implementation/database verification is separate from inspecting this frontend; do not connect the frontend directly to MySQL.
- `next.config.mjs` registers next-intl, `cacheComponents`, `partialPrefetching`, and Turbopack CSS/SVGR loaders. Do not assume a webpack configuration exists.
- Alias: `@/*` maps to `src/*`. Read `package.json`, the lockfile, installed packages, and relevant configuration before relying on an API or dependency. Next.js requires Node >= 20.9; check the installed package's engine requirements.
- Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`. On Windows use `npm.cmd`/`npx.cmd` if PowerShell blocks the `.ps1` shims; do not change execution policy.

## Repository map

Route groups organize App Router files without adding URL segments. Inspect each feature directory for its complete files; do not recreate, reorganize, move, or rename files merely to match a diagram.

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx                  # HTML, fonts, direction, Intl provider
│   │   ├── not-found.tsx
│   │   ├── admin-globals.css           # Admin theme, utilities, CSS overrides
│   │   ├── (web)/page.js               # Public homepage
│   │   └── (admin)/
│   │       ├── layout.tsx              # Server layout: theme and auth boundary
│   │       └── admin/
│   │           ├── (auth)/
│   │           │   ├── layout.tsx
│   │           │   ├── _components/SignInForm.tsx
│   │           │   └── login/page.tsx
│   │           └── (pages)/
│   │               ├── layout.tsx     # Protected pages and SidebarProvider
│   │               ├── _components/AdminShell.jsx
│   │               ├── dashboard/
│   │               │   ├── page.tsx
│   │               │   └── _components/
│   │               │       ├── DashboardSummary.tsx
│   │               │       └── DashboardSkeleton.tsx
│   │               └── admin-users/
│   │                   ├── page.tsx
│   │                   └── _components/
│   │                       ├── ActionButtons.tsx
│   │                       ├── AdminUserList.tsx
│   │                       ├── AdminUserForm.jsx
│   │                       ├── AdminUserDeleteConfirm.tsx
│   │                       ├── AdminUsersFilters.tsx
│   │                       └── UpdatePassword.tsx
│   ├── globals.css                    # Separate base/public styles
│   ├── backuplayout.js                 # Backup, not an active layout convention
│   └── favicon and application icons
├── actions/admin/                     # adminUsers.ts, auth.ts
├── components/
│   ├── common/                        # AppToaster, ImagePreview, loaders
│   └── admin/
│       ├── common/                    # Breadcrumb, cards, filters, URL pagination,
│       │                              # loading states, theme controls, toaster
│       ├── example/ModalExample/
│       ├── form/                      # Controls, input/, group-input/, switch/,
│       │                              # form-elements/, date-picker.tsx
│       ├── header/                    # UserDropdown, NotificationDropdown
│       ├── tables/                    # Pagination.tsx, BasicTableOne.tsx
│       └── ui/                        # alert, avatar, badge, button, dropdown,
│                                      # images, modal, table, video
├── context/                           # SidebarContext.tsx, ThemeContext.tsx
├── hooks/                             # useAdminAuth, useModal, useClickOutside,
│                                      # useGoBack
├── i18n/                              # routing, navigation, request, languages
├── icons/                             # SVG assets and index.tsx exports
├── layout/                            # AppHeader, AppSidebar, Backdrop, SidebarWidget
├── lib/
│   ├── api/                           # request.ts, ApiError.ts, handleActionError.ts
│   ├── apis/admin/                    # adminAuth.ts, adminUsers.ts
│   └── auth/                          # dal.ts, session.js, admin.js
├── messages/                          # en.json, hi.json
├── providers/                         # AdminAuthBoundary.tsx, Providers.tsx
├── store/                             # store.ts, hooks.ts, slices/adminAuthSlice.ts
├── types/                             # api.ts, auth.ts, admin/adminUser.ts
├── utils/index.ts                     # Shared utilities, including cn()
├── proxy.ts                           # Locale routing and cookie-based redirects
└── svg.d.ts

public/images/                         # Logos and smart-ag-bg.png
public/*.svg                           # Static assets
```

Root configuration includes `next.config.mjs`, `tsconfig.json`, `jsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `package.json`, and `package-lock.json`. Generated `.next/` and installed `node_modules/` are not application source. Do not resurrect removed template folders or refer to nonexistent `storeold/`, `(full-width-pages)`, or `(layouts-example)` groups as current architecture.

## Routes and component organization

| URL                  | Purpose                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `/`                  | Public homepage                                                            |
| `/admin/login`       | Admin login                                                                |
| `/admin/dashboard`   | Protected dashboard                                                        |
| `/admin/admin-users` | Admin listing, filtering, pagination, create/edit/delete, password updates |

- Add pages only under `src/app/[locale]/` in the appropriate existing group. Preserve `(web)`, `(admin)`, `(auth)`, and `(pages)`; new route groups require approval. Preserve the existing authentication and admin layouts without duplicating guards.
- Keep pages focused on composition and server data loading. Place route-specific UI in that route's `_components/` directory, not a new shared feature folder.
- Shared application components belong in `src/components/common/`. Shared admin components belong in `src/components/admin/common/`, `ui/`, `form/`, or `tables/`, according to responsibility.
- Inspect suitable existing UI before creating another component. Reuse `PageBreadCrumb.tsx`, `ComponentCard.tsx`, `FilterSelect.jsx`, form controls, table primitives, and pagination. Avoid duplicate components and unnecessary wrappers/abstractions.
- New React pages/components must use `.tsx`; new actions, clients, hooks, utilities, and types must use `.ts`. Existing `.js`/`.jsx` files remain unless the task requires editing them; do not migrate them as unrelated refactoring.
- Component filenames use PascalCase and normally default exports; route files use Next.js names (`page.tsx`, `layout.tsx`); hooks use camelCase (`useModal.ts`). Preserve existing public exports when editing.
- Import through `@/` across folders; relative imports are appropriate within a feature. Use focused components with explicit prop types and composition rather than monolithic JSX and prop drilling.
- Locale/admin root/protected layouts are Server Components. `AdminShell.jsx` and interactive UI are Client Components. Add `"use client"` at client entry points needing state, effects, event handlers, or browser APIs; do not convert server layouts or pass ordinary callbacks across the server/client boundary.

## Backend verification: blocking rule

Before implementing backend-dependent functionality:

1. Identify required Laravel API routes and verify their existence and HTTP methods.
2. Inspect controllers/business logic when accessible, request validation, payload fields, authentication/authorization, response fields, and status codes.
3. Check existing frontend API methods and confirm that the verified backend behavior supports the requested feature.

An existing frontend client or a similar endpoint is not proof that a Laravel route exists. Do not guess endpoint paths, methods, request/response fields, or database behavior.

**If required backend functionality is missing or cannot be verified, stop backend-dependent frontend implementation.** Report the missing/unverified endpoint, method, required fields, known response contract, missing access/functionality, and required next action. Wait for backend implementation, verification, or explicit user approval before proceeding. Do not invent endpoints or mock backend behavior as a substitute. Purely presentational and documentation tasks without a backend dependency may proceed normally.

## API and Server Action architecture

```text
Client form/dialog
  -> src/actions/admin/                 # Auth, feature client call, ActionResult
  -> src/lib/apis/admin/                # Endpoint-specific methods
  -> src/lib/api/request.ts             # apiRequest(), native Fetch
  -> Laravel REST API

Success -> ActionResult -> success toast -> dialog close
Failure -> ApiError -> handleActionError -> ActionResult -> error feedback/fields

Server page reads -> feature API client -> apiRequest() -> Laravel
```

Read `src/lib/apis/admin/adminAuth.ts`, `src/lib/apis/admin/adminUsers.ts`, and `src/actions/admin/adminUsers.ts` before extending their patterns. Do not force read-only page requests through unnecessary wrapper Server Actions.

### Shared HTTP client

Inspect `src/lib/api/request.ts` before adding an integration. Its current signature is:

```ts
apiRequest<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T>
```

- `T` describes the entire response, such as `ApiResponse<AdminUser>` or `AdminUsersListResponse`, not only its inner `data` field.
- Reuse the actual options: `method`, `data`, `params`, and `audience` (`admin`, `web`, `public`). The defaults are GET and admin audience.
- This server-only utility owns relative-path checks, `API_BASE_URL`, query parameters, token cookies, Bearer headers, JSON/FormData bodies, `cache: "no-store"`, the 30-second timeout, response parsing, and `ApiError` construction.
- Respect current restrictions: GET and DELETE cannot carry a body. Do not manually set multipart boundaries, duplicate authentication/error normalization, or bypass path/audience checks.
- Preserve empty-response and error-field behavior. Do not silently compensate for contract mismatches by changing this utility, reshaping responses, adding wrappers, or asserting invented fields.
- Feature clients must remain server-only and delegate backend requests to this utility. Do not import them into Client Components or bypass them with independent Fetch implementations.
- Modifying `request.ts` or its behavior requires explicit approval.

### Feature clients and mutation actions

- Admin endpoint methods belong in `src/lib/apis/admin/`. Follow current naming, exports, HTTP methods, request bodies, authentication, and response types. Reuse existing methods before adding another module; leave unrelated clients alone.
- Admin mutation actions belong in `src/actions/admin/` with `"use server"`. Keep endpoint logic in feature clients and call them instead of duplicating Fetch or endpoint definitions inside actions.
- Inspect `src/lib/auth/dal.ts`; reuse `requireAdmin()` and established backend authorization. Authenticate mutations even when a protected page rendered the form.
- Follow actual operation signatures rather than inventing wrapper actions:

| Server Action               | Feature client method    |
| --------------------------- | ------------------------ |
| `saveAdminUser()`           | `create()` or `update()` |
| `deleteAdminUser()`         | `delete()`               |
| `changeAdminUserPassword()` | `changePassword()`       |

- Return serializable `ActionResult<T>` results with safe messages and backend validation errors. Reuse `handleActionError()` in catches; do not duplicate status mapping or expose internal exceptions/5xx details.
- Preserve Next.js redirect/not-found/control-flow exceptions. The shared handler calls `unstable_rethrow()` before mapping application errors; do not swallow those exceptions in replacement catches.
- Follow existing cache revalidation after successful mutations when rendered data needs updating. Revalidate only affected data/paths, not failures or operations that do not require a refresh.

## TypeScript contracts and backend-owned data

- Reuse `src/types/api.ts`: `ApiResponse<T>`, `PaginatedResponse<T>`, `PaginationMeta`, `ApiValidationErrors`, `ApiRequestOptions`, `ActionResult<T>`, and page/search-param contracts.
- Authentication contracts belong in `src/types/auth.ts`; shared admin domain/payload contracts belong in `src/types/admin/`, such as `adminUser.ts`.
- Inspect existing consumers before changing types. Preserve nullable fields, backend status values, field names, and pagination metadata. Avoid `any`, duplicate interfaces, invented API fields, and unnecessary status conversions.
- Laravel owns response formatting and normalization. Use returned data/server-provided display labels directly where possible. Do not add redundant string normalization, date formatting, response reshaping, mapping helpers, validation transformations, response wrappers, or backend structure reconstruction.
- Perform only necessary UI transformations consistent with current conventions, such as URL query handling, form state, interpolation, or rendering options. Report unsuitable backend data/contracts rather than silently adding a transformation layer.

## Authentication, providers, and state

Inspect `src/lib/auth/{dal.ts,session.js,admin.js}`, `src/hooks/useAdminAuth.ts`, `src/providers/`, `src/store/`, and relevant consumers before changing authentication behavior.

- Preserve the HttpOnly-cookie-backed login/session flow, current-admin lookup, and backend session verification. Cookie-based proxy redirects do not replace `requireAdmin()` or backend authorization.
- Keep token handling server-side in existing session helpers. Do not add a second auth system, separate token store, browser credential storage, or direct client access to secrets.
- Preserve `AdminAuthBoundary` and Redux initialization through `Providers.tsx`. Reuse store hooks and `adminAuthSlice`; do not duplicate server auth data unnecessarily in local state.
- Preserve the hierarchy: locale layout/Intl provider; admin root theme/auth boundary; protected pages guard/SidebarProvider; client `AdminShell` with header/sidebar/backdrop/toaster.
- Reuse `SidebarContext`/`useSidebar`, `ThemeContext`/`useTheme`, and `useModal`. Do not duplicate providers or change sessions, protected layouts, auth architecture, or state frameworks without approval.

## Internationalization and navigation

- Source of truth: `src/i18n/routing.ts`, `navigation.ts`, `request.ts`, and `languages.ts`. Current locales are `en` and `hi`, default `en`, with `localePrefix: "never"`. Do not hardcode prefixes or enable locales as an unrelated change.
- Import `Link`, `useRouter`, `usePathname`, and `redirect` from `@/i18n/navigation`, not directly from Next.js navigation modules. Next-only APIs not exported there (`useSearchParams`, `notFound`, `unstable_rethrow`) may use their Next.js imports.
- Client Components use `useTranslations(namespace)`; async Server Components/actions use `getTranslations(namespace)` from `next-intl/server`. Preserve established next-intl handling in shared synchronous components.
- Localized server pages/layouts must await locale params and call `setRequestLocale(locale)` as appropriate for static rendering with the existing `generateStaticParams()` setup.
- All added/changed user-facing text requires matching keys in **both** `src/messages/en.json` and `hi.json`: labels, headings, placeholders, accessibility text, validation, loading/empty states, table labels, toasts, and status messages.
- Follow nested feature namespaces and existing naming; reuse suitable keys, avoid duplicates, and use clear, contextually appropriate Hindi. Keep record data, identifiers, URLs, and backend codes distinct from interface labels.
- Preserve interpolation (`{name}`, `{count}`, `{total}`), rich-text tags, and ICU/plural syntax in both languages. Prefer complete interpolated/rich sentences over fragments concatenated around values or markup.
- Do not rename/remove existing keys without approval. For an authorized cleanup, audit dynamic references as well as literal calls before deletion; preserve used values and matching language structures.
- Current English/Hindi layouts are LTR. Preserve `isRtl(locale)` and direction-aware behavior for future RTL languages; do not claim Arabic is currently enabled.

### Dynamic translation fields in forms

For editable record translations, use the shared language catalog:

```ts
import { getLanguage, languages } from "@/i18n/languages";
```

- Generate translation groups from `languages`; use each language's `id` as the translation key and `getLanguage(id)` for its name and direction. Do not hardcode English/Hindi groups, duplicate locale arrays, or branch on individual locale IDs to generate fields. Keep each group's name, description, and other supported inputs explicitly declared inside the language loop.
- Build create defaults, edit defaults, submission payloads, and successful-create resets from the same catalog. Load existing values by language ID, initialize missing fields appropriately, and preserve the feature's existing optional/null handling and partial-save retry state.
- Use locale-keyed types such as `Record<string, { name: string; description: string }>` with the feature's actual fields and nullability. Do not restrict record translation keys to `"en" | "hi"` or the interface's routing `Locale` type.
- Register fields with dynamic paths such as `translations.${id}.name` and map backend validation errors to the matching configured-language fields. Use stable language-specific input/error IDs, accessible labels, `lang={id}`, and the language's `dir`. Preserve the verified field limits and required-name rules for that feature.
- Where mutation actions allowlist translation data, derive their locale keys from `languages` and retain only writable fields. Do not silently drop a configured language through a fixed payload shape, or delete omitted stored translations. Preserve the verified backend update semantics.
- Keep placeholders, validation, help text, and accessibility text in matching English/Hindi message keys. Use interpolation such as `{language}` for catalog-provided names; avoid wording that assumes exactly two translation languages. Record translation data and language metadata are separate from interface message translations.
- Adding a language to the catalog must not require editing each form. Verify that Laravel's supported-language configuration and endpoint validation also accept it before enabling saves for that language. Adding a record translation language does not automatically enable an interface locale; preserve `routing.ts` and the existing locale selector behavior unless that change is explicitly requested.
- When changing this flow, cover an additional configured language in regression checks, including edit defaults, submission, field errors, direction, and create reset. Preserve existing status/publication, hierarchy, filtering, pagination, and retry behavior. Use the Crop, Crop Category, and Region forms as current implementation references.

## TailAdmin theme and styling

Inspect a similar page/component before building UI. Follow TailAdmin v2.3 typography, spacing, colors, borders, responsive design, and consistent loading/disabled/hover/active/focus/error states. Support light/dark modes and reuse existing components; do not introduce another UI framework.

- The admin `@theme`, class-based `@custom-variant dark`, reusable utilities, and third-party overrides live in **`src/app/[locale]/admin-globals.css`**, imported by the locale layout. `src/app/globals.css` is a separate base stylesheet. There is no `tailwind.config`; do not create one.
- Global stylesheet/theme changes require approval. Avoid unnecessary custom CSS and inline styles; use existing utilities/components first.
- Use available tokens, not hardcoded hex colors or arbitrary pixel values in `className`: `brand`, `gray`, `blue-light`, `orange`, `success`, `error`, `warning`, existing theme pink/purple colors; `font-outfit`, `text-theme-*`, `text-title-*`; `shadow-theme-*` and named focus/navigation/tooltip shadows; existing breakpoints and z-index tokens. Inspect the actual palette before selecting values.
- Preserve custom breakpoints `2xsm` (375px), `xsm` (425px), and `3xl` (2000px), plus the standard breakpoints. Reuse available `z-1`, `z-9`, `z-99`, and higher theme layers, and named shadows such as `shadow-focus-ring`, `shadow-slider-navigation`, `shadow-tooltip`, and `shadow-datepicker` where appropriate.
- Preserve class-based dark mode through `ThemeContext` (light/dark/auto); provide corresponding dark styles for color-dependent UI rather than relying on OS-only media queries.
- Use logical utilities: `ms/me`, `ps/pe`, `start/end`, `border-s/e`, `rounded-s/e` and logical corners, `text-start/end`. Do not introduce physical `ml/mr`, `pl/pr`, `left/right`, `border-l/r`, `rounded-l/r`, or `text-left/right` where logical equivalents exist.
- Mirror directional icons with `rtl:rotate-180` or `rtl:-scale-x-100`; mirror off-canvas transforms. Use `ltr:`/`rtl:` overrides when an integration requires them.
- Reuse `menu-item-*`, `menu-dropdown-*`, `custom-scrollbar`, `no-scrollbar`, and other available utilities. Approved third-party CSS overrides belong alongside existing admin overrides, matching their `@apply` style.
- Authorized installed chart integrations may use hex values copied from theme tokens in option objects. This exception does not permit arbitrary hex colors in component classes.
- Add new SVG assets under `src/icons/`, export PascalCase components from `index.tsx`, and import from `@/icons`. Do not add inline SVG markup or another icon system.
- For approved client-only chart/calendar/carousel integrations, confirm the package is installed and use `next/dynamic` with `ssr: false` in a Client Component unless an existing client-only boundary already isolates it. Removed examples/legacy CSS do not justify installing ApexCharts, FullCalendar, or other absent packages.

## Forms, dialogs, and notifications

Use `AdminUserForm.jsx`, `UpdatePassword.tsx`, and `AdminUserDeleteConfirm.tsx` as UI/CRUD references while following the new-code TypeScript rule. Reuse admin form controls and existing Headless UI `Dialog`, `DialogBackdrop`, `DialogPanel`, `DialogTitle`, and `Description` patterns.

- All new admin forms use typed `react-hook-form`/`useForm`. Keep user-facing field validation in that form component; do not create separate validation files or add another schema/form validation library without approval.
- **Declare ordinary form fields individually; do not generate them from field-configuration arrays.** Translation groups must be generated from `languages` as described above: mapping languages is required, while each input within the group remains explicitly declared. Mapping records or select options is also allowed.
- Backend validation/authorization remains authoritative. Do not duplicate Laravel validation/normalization unnecessarily in actions; client validation is not an authentication or authorization boundary.
- Map backend `ActionResult.errors` to matching fields with `setError`, show useful form-level failures, and allow correction/retry. Use translated validation messages and existing TailAdmin error styles.
- Provide accessible labels, error associations, dialog descriptions, and focus behavior. Use loading/submission state to disable relevant controls, prevent duplicate requests, and guard dismissal during mutations.
- Reuse `useModal` where a parent owns modal state. Keep local state/parent callbacks focused; do not introduce another dialog framework.
- Reuse `react-hot-toast` and mounted `AdminToaster`/`AppToaster`; do not mount a toaster per form or introduce another notification library. AdminShell hosts the admin toaster.
- Successful add/update/password-change/delete operations show one success toast using the action message with a translated fallback, then close the dialog. Cancel/dismiss actions must not show success/failure toasts or pass click events as action results.
- Failures need appropriate translated error toasts and inline field/form feedback without duplicate notifications. Keep recoverable failures open for retry. Do not use browser `alert()` for normal feedback.
- **Every destructive deletion requires confirmation.** Show the record name/title, consequences, Cancel/Delete actions, and an in-progress state. Never execute deletion before confirmation or use `window.confirm()`; close on success and follow existing toast/error patterns.

### Single-image form uploads

**Every admin form field that uploads one image must use the shared component**, following `src/app/[locale]/(admin)/admin/(pages)/crops/_components/CropForm.tsx`:

```ts
import ImageUpload from "@/components/admin/common/ImageUpload";
```

- Reuse this component for single-image fields such as a main image, thumbnail, avatar, or banner. Do not create feature-specific copies, duplicate its file-input/drop-area/preview UI, or introduce another upload library. Multiple-file attachments have a separate workflow; display-only images can use `ImagePreview` directly.
- Keep field validation and upload/removal state in the typed React Hook Form parent. Provide a unique `id`, translated `label`, backend-provided `existingImageUrl`, controlled `selectedFile`, `inputProps={register("image", { validate: validateImage })}`, `error={errors.image?.message}`, and submission-driven `disabled`. Use the feature's actual field name when it differs from `image`.
- The parent's `onChange(files)` handler must guard submissions, update the registered file array with `setValue(..., { shouldValidate: true, shouldDirty: true })`, and return `false` for invalid selections or `true` after accepting the selection. Match the verified backend file-count, type, extension, nonempty-file, and size requirements. Pass the corresponding `maxSizeMB` for accurate guidance; that prop displays the limit and does not replace validation. The shared component currently accepts JPEG, PNG, and WebP; do not copy CropForm's 5 MB limit into unrelated features without checking their backend rules.
- Selecting or discarding a replacement is a local draft change. Discarding the selected file must restore the existing image preview when one exists. Keep backend requests, authentication, feature actions, and record-specific confirmation outside `ImageUpload`.
- Existing-image removal requires confirmation and must be staged using `removalPending`, `onRemoveExisting`, and `onUndoRemove`. Confirmation marks the image for removal and allows Undo; it must not immediately modify the database or delete a stored file. Apply removal only when the user submits the form successfully. Cancellation and failed saves must leave the stored image intact and preserve recoverable form state.
- Save image changes with the record through the verified create/update endpoint when supported. Use the existing Server Action -> feature client -> `apiRequest()` flow, native `FormData` for selected files, and the backend's required multipart update method. Omit an unchanged image; send an explicit removal value only as defined by the verified backend contract. Laravel owns database updates and stored-file cleanup. Do not invent a removal flag, endpoint, storage path, or a separate upload request.
- After a successful save, clear the selected file and removal draft and reset the uploader's local/native-input state, using CropForm's reset-key pattern where needed for preserved pages. Keep selections and pending removal available after recoverable failures. Preserve the shared preview, cloud icon, configurable size guidance, accessibility, light/dark styling, and English/Hindi `ui.imageUpload` messages.

## Tables, filters, pagination, and loading

Admin Users is the reference for future admin CRUD pages. Reuse `AdminUserList.tsx`, `AdminUsersFilters.tsx`, and `ActionButtons.tsx` patterns with `src/components/admin/ui/table/index.tsx`, `tables/Pagination.tsx`, `common/UrlPagination.tsx`, and `common/FilterSelect.jsx`.

- Use backend filtering and pagination metadata; do not add client filtering/pagination when the backend supports it.
- Preserve applied filters/relevant query parameters when changing pages. Applying/resetting filters returns to page 1. Keep controls synchronized with URL changes and browser Back/Forward navigation.
- Keep URL event handlers in Client Components. Server pages await `searchParams` and call feature clients; do not move server-only clients into filter/pagination components.
- Preserve valid inactive values such as status `0`; do not discard them with truthiness checks or change backend status types.
- Follow existing Suspense/loading/skeleton and empty-state patterns. Reuse `SuspenseFallback`, `DashboardSkeleton`, and shared loaders with translated text where suitable.
- Reuse `PageBreadCrumb` at page level and `ComponentCard` for comparable sections/examples. Preserve table theme/responsive behavior. Another data-table library requires approval.

## Approval boundaries

Obtain explicit user approval before:

- Changing folder architecture, creating route groups, or moving/renaming shared components.
- Adding/replacing dependencies or form/table/UI/state frameworks.
- Changing shared `apiRequest()` behavior or backend-managed response formats.
- Changing authentication/sessions, protected layouts, or provider structure.
- Changing global styles or theme configuration.
- Modifying unrelated modules or introducing shared abstractions beyond the requested scope.

Do not infer approval for unrelated refactoring from a feature request. Never introduce Axios or a parallel HTTP client under these rules. An explicit request to change a particular component/file authorizes that requested change; do not request permission already given.

## Development and verification workflow

1. **Inspect:** read relevant files, similar modules, packages/configuration, shared types, theme, and translation conventions. Read the applicable installed Next.js guide before coding. Identify route ownership and reusable UI.
2. **Verify backend:** apply the blocking rule before backend-dependent implementation; report missing access/contracts instead of guessing.
3. **Check architecture:** choose existing routes, `_components`, actions, feature clients, utilities, and types. Resolve required approvals before structural/unrelated changes.
4. **Implement narrowly:** use TypeScript, TailAdmin light/dark UI, explicit React Hook Form fields with catalog-driven translation groups, English/Hindi messages, existing feedback/confirmation, and the prescribed action/client/Fetch flow. Preserve API contracts and user changes.
5. **Validate proportionately:** run applicable TypeScript (`npx tsc --noEmit`), ESLint (`npm run lint` or targeted ESLint), formatting, and existing relevant tests. Check translations/interpolation, form validation, loading/error/empty states, filters/pagination, light/dark/responsive behavior, and backend contracts. Documentation-only changes need Markdown formatting and diff/scope checks; do not modify application code to fix unrelated checks.
6. **Review and report:** check the diff for unintended files, duplicate APIs/helpers, and contract changes. Summarize created/modified files, endpoints/actions used or changed, translation updates, checks actually executed, and remaining issues where relevant. Distinguish existing failures from regressions. Never claim a check passed or a backend endpoint was verified without executing/inspecting it.
