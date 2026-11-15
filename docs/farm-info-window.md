# Farm map popup

The saved-farm popup follows the supplied UI reference: a 320px white rounded
card, light-green header, existing local farm illustration, recorded area, one
custom Close button, five 48px menu rows with dividers and chevrons, and a white
geographic pointer. Dark mode uses the existing theme. Narrow cards adapt to
available width; longer names wrap within two lines and retain their full title.
The menu scrolls independently when height is limited, keeping the header and
Close accessible.

`FarmInfoWindow.tsx` is the reusable presentation component. Its farm prop derives
from the existing Farm type; area formatting and labels use the common area-unit
utility/metadata. The header retains the original recorded measurement and never
converts it to the profile preference. An existing formatted area label is a
fallback for older dashboard view-model consumers. Empty areas stay unavailable;
zero is not treated as missing.

## Maps integration and selection

`FarmInfoOverlay.tsx` replaces the previous native InfoWindow with one
[supported OverlayView](https://developers.google.com/maps/documentation/javascript/reference/overlay-view).
The existing SDK/map instance is reused. `onAdd`, `draw`, and `onRemove` attach,
project and remove the host in `floatPane`; a React portal retains the existing
Intl, theme and application context. There is no second React root, map loader,
native popup frame, default close button, or dependency on Google's internal CSS.
The public `preventMapHitsAndGesturesFrom()` isolates popup pointer/touch/wheel
interactions. Keyboard events retain native Tab behavior and prevent map shortcuts.

Both saved-feature clicks and the existing Farm List selection/focus path use
DashboardMap's shared selected ID. Closing changes only popup visibility. Clicking
the same polygon or focusing its list record reopens it; selecting another farm
reuses the one overlay. Existing Edit, Locate and More row actions remain intact.
No Farm Details fetch, new API/action, crop request, destructive operation, or
backend change is introduced.

`farmAnchor()` keeps a valid saved point inside the parcel or the existing extent
center when it belongs to the farm. Concave, holed or separated parcels fall back
to a genuine exterior boundary point. Coordinate-only records use their valid
saved location. Missing geography never creates a popup at invented coordinates.
Stored geometry, visibility, selection colors, thumbnails and map bounds logic
are unchanged.

Popup positioning uses both supported map projections, the existing viewport,
actual sidebar width, panel height, RTL direction, and the map control column. It
prefers the right side, flips left or above/below, and scrolls within the remaining
height. Explicit selection/focus allows one minimal reveal pan; normal map draws,
rerenders, and content updates do not repeatedly pan. Restored locale snapshots
start without an automatic reveal pan. Pan, zoom and map-type changes reproject
the geographic anchor. If available space is too small, the popup hides and can
return when space is available. Panel height and sidebar state are never changed.

Farm/boundary/fullscreen editor workflows detach the popup while they own the
viewport. Escape closes the nonmodal popup while respecting active modal dialogs
and other editable inputs. Close restores prior focus when focus was inside the
popup. Overlay removal, account/map changes and Strict Mode clean up hosts,
observers, and listeners.

## Future menu actions

Planting Crops, Historical Crops, Farm Details, Edit Farm, and Delete Farm appear
in that exact order. They expose `aria-disabled`, the localized Coming Soon title,
and a screen-reader description. They retain focus/hover styling without any
operation or navigation. Delete's text/icon are red on the white row. The small
typed menu definition stays inside the card component for later integration.
The working Farm Manager Edit button continues to use its existing workflow.

## Files

Created:

- `src/components/common/maps/FarmInfoWindow.tsx`
- `src/components/common/maps/FarmInfoOverlay.tsx`
- `tests/farmInfoWindow.test.cjs`
- `docs/farm-info-window.md`

Modified:

- Protected Account `_components/DashboardMap.tsx`
- Protected Account `_components/AccountDashboardShell.tsx`
- Protected Account `_components/dashboardTypes.ts`
- Protected Account `_components/googleMaps.ts`
- Protected Account `_components/farmGeometry.ts`
- Protected Account `_components/mapViewport.ts`
- `src/messages/en.json`, `src/messages/hi.json`
- `tests/farmerDashboard.test.cjs`
- `docs/farmer-dashboard.md`

English/Hindi `farmInfoWindow` messages cover the new menu labels, area fallback
and accessible action-group name. Existing Edit, Close and Coming Soon messages
are reused.

## Verification

Passed 220 targeted popup, dashboard, farm, area-unit, profile, authentication and
API tests; TypeScript, changed-source ESLint, formatting and the production build.

Automated checks mock Maps, DOM projection, observer and area metadata behavior;
they make no live billable Maps requests. Coverage includes both languages,
original measurements, untrusted/long names, menu order/colors/inactive behavior,
close/reopen, geographic anchors, layout, pan/resize, keyboard isolation, blocked
editors, Strict Mode, focus and cleanup, plus existing dashboard/farm/auth/profile
regressions. Live visual comparison could not run: the browser access host was
unavailable and the Windows helper failed to initialize. No Google Maps
configuration changes are needed.
