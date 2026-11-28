import type { ComponentType, SVGProps } from "react";
import {
  CrosshairIcon,
  FarmFieldIcon,
  FarmHouseIcon,
  FitMapIcon,
  LocationPinIcon,
  MapLayersIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
  WaterDropIcon,
} from "@/icons";
import type { FabGroupId, MapType } from "../dashboardTypes";
import type { IrrigationLayers } from "../../irrigation/_components/irrigationMap";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * What the current page supports, and the existing handlers the buttons call.
 * `irrigation` is present when the map shows irrigation assets; the dashboard
 * shell shows them on every page, like farms and crops.
 */
export interface FabContext {
  mapType: MapType;
  mapReady: boolean;
  /** Drawing a boundary or holding an unsaved draft. */
  drawing: boolean;
  onAddFarm: () => void;
  onDrawFarm: () => void;
  onMapType: (type: MapType) => void;
  onLocate: () => void;
  onFit: () => void;
  onReset: () => void;
  irrigation?: {
    layers: IrrigationLayers;
    onToggleLayer: (layer: keyof IrrigationLayers) => void;
    onFit: () => void;
  };
}
export interface FabItem {
  id: string;
  /** Key in `farmerDashboard.actions`. */
  label: string;
  icon: Icon;
  /** Background of the icon circle. */
  color: string;
  /** Actions close their group; toggles keep it open for the next change. */
  kind: "action" | "toggle";
  /** Layer toggles only: whether the layer is shown (`aria-pressed`). */
  pressed?: boolean;
  disabled: boolean;
  /** Draw a thin divider above this item. */
  divider?: boolean;
  run: () => void;
}
export interface FabGroup {
  id: FabGroupId;
  /** Key in `farmerDashboard.actions`. */
  label: string;
  icon: Icon;
  color: string;
  items: FabItem[];
  /** Map Layers on pages with layer toggles: how many are on, e.g. "2/3". */
  badge?: string;
  /** Key in `farmerDashboard.actions` explaining why the group can't open now. */
  blocked?: string;
}

type Value<T> = T | ((context: FabContext) => T);
interface ItemDefinition {
  id: string;
  label: Value<string>;
  icon: Icon;
  color: string;
  kind: FabItem["kind"];
  /** Whether this page offers the item. Defaults to every page. */
  available?: (context: FabContext) => boolean;
  pressed?: (context: FabContext) => boolean;
  disabled?: (context: FabContext) => boolean;
  divider?: boolean;
  run: (context: FabContext) => void;
}
export interface FabGroupDefinition {
  id: FabGroupId;
  label: string;
  icon: Icon;
  color: string;
  items: ItemDefinition[];
  badge?: (context: FabContext) => string | undefined;
  blocked?: (context: FabContext) => string | undefined;
}

const mapLoading = (context: FabContext) => !context.mapReady;
const irrigation = (context: FabContext) => Boolean(context.irrigation);
const layerToggle = (
  layer: keyof IrrigationLayers,
  label: string,
  icon: Icon,
  color: string,
): ItemDefinition => ({
  id: label,
  label,
  icon,
  color,
  kind: "toggle",
  available: irrigation,
  pressed: (context) => Boolean(context.irrigation?.layers[layer]),
  disabled: mapLoading,
  run: (context) => context.irrigation?.onToggleLayer(layer),
});

/** Which existing action belongs to which group, top to bottom. */
export const fabGroupDefinitions: FabGroupDefinition[] = [
  {
    id: "farm",
    label: "farmGroup",
    icon: FarmHouseIcon,
    color: "bg-success-700",
    // Starting Add Farm mid-drawing would compete with the draft.
    blocked: (context) => (context.drawing ? "finishDrawing" : undefined),
    items: [
      {
        id: "addFarm",
        label: "addFarm",
        icon: PlusIcon,
        color: "bg-error-600",
        kind: "action",
        run: (context) => context.onAddFarm(),
      },
      {
        id: "drawFarm",
        label: "drawFarm",
        icon: PencilIcon,
        color: "bg-success-700",
        kind: "action",
        disabled: mapLoading,
        run: (context) => context.onDrawFarm(),
      },
    ],
  },
  {
    id: "view",
    label: "viewGroup",
    icon: CrosshairIcon,
    // The theme has no violet. Tailwind's built-in violet-700 (approved) keeps
    // the group apart from Fit All Farms' theme-purple-500.
    color: "bg-violet-700",
    items: [
      {
        id: "myLocation",
        label: "myLocation",
        icon: LocationPinIcon,
        color: "bg-orange-500",
        kind: "action",
        disabled: mapLoading,
        run: (context) => context.onLocate(),
      },
      {
        id: "fitAll",
        label: "fitAll",
        icon: FitMapIcon,
        color: "bg-theme-purple-500",
        kind: "action",
        disabled: mapLoading,
        run: (context) => context.onFit(),
      },
      {
        id: "fitIrrigation",
        label: "fitIrrigation",
        icon: FitMapIcon,
        color: "bg-blue-light-600",
        kind: "action",
        available: irrigation,
        disabled: mapLoading,
        run: (context) => context.irrigation?.onFit(),
      },
    ],
  },
  {
    id: "layers",
    label: "layerGroup",
    icon: MapLayersIcon,
    color: "bg-blue-light-800",
    badge: (context) => {
      if (!context.irrigation) return undefined;
      const layers = Object.values(context.irrigation.layers);
      return `${layers.filter(Boolean).length}/${layers.length}`;
    },
    items: [
      {
        id: "mapType",
        // The label names the type it switches to.
        label: (context) =>
          context.mapType === "roadmap" ? "satellite" : "roadmap",
        icon: MapLayersIcon,
        color: "bg-success-600",
        kind: "toggle",
        disabled: mapLoading,
        run: (context) =>
          context.onMapType(
            context.mapType === "roadmap" ? "satellite" : "roadmap",
          ),
      },
      layerToggle("farms", "farmBoundaries", FarmFieldIcon, "bg-success-600"),
      layerToggle(
        "sources",
        "waterSources",
        WaterDropIcon,
        "bg-blue-light-600",
      ),
      layerToggle("pipelines", "pipelines", RouteIcon, "bg-blue-light-700"),
      {
        id: "resetLayers",
        label: "resetLayers",
        icon: MapLayersIcon,
        color: "bg-gray-600",
        kind: "action",
        divider: true,
        disabled: mapLoading,
        run: (context) => context.onReset(),
      },
    ],
  },
];

/** The groups and items this page supports. A group with no items is left out. */
export function fabGroups(
  context: FabContext,
  definitions: readonly FabGroupDefinition[] = fabGroupDefinitions,
): FabGroup[] {
  return definitions.flatMap((group) => {
    const items = group.items
      .filter((item) => item.available?.(context) ?? true)
      .map((item): FabItem => ({
        id: item.id,
        label:
          typeof item.label === "function" ? item.label(context) : item.label,
        icon: item.icon,
        color: item.color,
        kind: item.kind,
        pressed: item.pressed?.(context),
        disabled: item.disabled?.(context) ?? false,
        divider: item.divider,
        run: () => item.run(context),
      }));
    if (!items.length) return [];
    return [
      {
        id: group.id,
        label: group.label,
        icon: group.icon,
        color: group.color,
        items,
        badge: group.badge?.(context),
        blocked: group.blocked?.(context),
      },
    ];
  });
}

/**
 * Row height (px): 32 px buttons, at least 44 px tall below the `sm`
 * breakpoint (`min-h-11 sm:min-h-0`). The drawing toolbar matches it.
 */
export const fabRowHeight = (compact: boolean) => (compact ? 44 : 32);
/** `gap-2` between rows; a divider is a 1 px line with 2 px margins. */
const FAB_GAP = 8;
const FAB_DIVIDER = 5;
const column = (heights: number[]) =>
  heights.reduce((total, height) => total + height, 0) +
  Math.max(0, heights.length - 1) * FAB_GAP;

export interface FabLayout {
  /** The main buttons above the open group step aside for its items. */
  hideAbove: boolean;
  /** The zoom buttons at the top right step aside too. */
  hideZoom: boolean;
  /** Even then too tall (a tiny map): the stack scrolls, without a scrollbar. */
  scrolls: boolean;
}
/**
 * How the stack fits above the panel without scrolling: as it is if there's
 * room, else the main buttons above the open group make way, else the zoom
 * buttons, else both. The open group's own button never moves.
 */
export function fabLayout({
  groups,
  open,
  draw,
  row,
  space,
  zoomSpace,
}: {
  groups: readonly FabGroup[];
  open: FabGroupId | null;
  /** Whether the Draw row is shown. */
  draw: boolean;
  row: number;
  /** Height below the top-right controls. */
  space: number;
  /** Extra height when the zoom buttons step aside; 0 when they aren't shown. */
  zoomSpace: number;
}): FabLayout {
  const index = groups.findIndex((group) => group.id === open);
  const height = (hideAbove: boolean) =>
    column([
      ...(draw ? [row] : []),
      ...groups
        .slice(hideAbove && index > 0 ? index : 0)
        .flatMap((group) =>
          group.id === open
            ? [
                column(
                  group.items.flatMap((item) =>
                    item.divider ? [FAB_DIVIDER, row] : [row],
                  ),
                ),
                row,
              ]
            : [row],
        ),
    ]);
  const options = [
    { hideAbove: false, hideZoom: false },
    { hideAbove: true, hideZoom: false },
    { hideAbove: false, hideZoom: true },
    { hideAbove: true, hideZoom: true },
  ].filter(
    (option) =>
      (!option.hideAbove || index > 0) && (!option.hideZoom || zoomSpace > 0),
  );
  const fit = options.find(
    (option) =>
      height(option.hideAbove) <= space + (option.hideZoom ? zoomSpace : 0),
  );
  return fit
    ? { ...fit, scrolls: false }
    : { ...options[options.length - 1], scrolls: true };
}
