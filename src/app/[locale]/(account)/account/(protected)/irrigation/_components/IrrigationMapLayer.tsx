"use client";
import { useEffect, useRef } from "react";
import type {
  IrrigationMapFeature,
  IrrigationSourceType,
  IrrigationStatus,
} from "@/types/account/irrigation";
import type {
  MapsInstance,
  MapsListener,
  MapsPolyline,
  MapsSDK,
  MapsSymbol,
} from "../../_components/googleMaps";
import {
  IRRIGATION_COLORS,
  pipelinePatterns,
  sourceMarkerIcon,
  toPosition,
  type IrrigationLayers,
  type PipelinePattern,
} from "./irrigationMap";

function patternIcons(
  pattern: PipelinePattern,
  sdk: MapsSDK,
  color: string,
  opacity: number,
  weight: number,
) {
  const dash: MapsSymbol = {
    path: "M 0,-1 0,1",
    strokeColor: color,
    strokeOpacity: opacity,
    strokeWeight: weight,
    scale: 3,
  };
  const dot: MapsSymbol = {
    path: sdk.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: opacity,
    strokeOpacity: 0,
    scale: weight / 2 + 0.5,
  };
  if (pattern === "dashed")
    return [{ icon: dash, offset: "0", repeat: "14px" }];
  if (pattern === "dotted") return [{ icon: dot, offset: "0", repeat: "9px" }];
  if (pattern === "dashDot")
    return [
      { icon: dash, offset: "0", repeat: "22px" },
      { icon: dot, offset: "14px", repeat: "22px" },
    ];
  return undefined;
}

/**
 * Saved water sources (blue pins) and pipelines (blue lines whose pattern shows
 * the pipeline type) on the dashboard map. While a location is edited the layer
 * fades, ignores clicks and hides the asset being edited.
 */
export default function IrrigationMapLayer({
  sdk,
  map,
  features,
  selectedId,
  layers,
  hiddenId,
  interactive,
  onSelect,
}: {
  sdk: MapsSDK;
  map: MapsInstance;
  features: readonly IrrigationMapFeature[];
  selectedId: string | null;
  layers: Pick<IrrigationLayers, "sources" | "pipelines">;
  hiddenId: string | null;
  interactive: boolean;
  onSelect: (id: string) => void;
}) {
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  });

  useEffect(() => {
    const data = new sdk.Data({ map });
    const sources = layers.sources
      ? features.filter(
          (feature) =>
            feature.properties.asset_type === "source" &&
            feature.id !== hiddenId,
        )
      : [];
    if (sources.length)
      data.addGeoJson({ type: "FeatureCollection", features: sources });
    data.setStyle((feature) => {
      const id = String(feature.getId());
      const selected = id === selectedId;
      const icon = sourceMarkerIcon(
        feature.getProperty("source_type") as IrrigationSourceType,
        feature.getProperty("status") as IrrigationStatus,
        selected,
        !interactive,
      );
      const name = feature.getProperty("name");
      return {
        clickable: interactive,
        zIndex: selected ? 60 : 50,
        title: typeof name === "string" ? name : undefined,
        icon: {
          url: icon.url,
          scaledSize: new sdk.Size(icon.width, icon.height),
          anchor: new sdk.Point(icon.anchorX, icon.anchorY),
        },
      };
    });
    const listener = data.addListener("click", ({ feature }) =>
      select.current(String(feature.getId())),
    );
    return () => {
      listener.remove();
      data.setMap(null);
      sdk.event.clearInstanceListeners(data);
    };
  }, [sdk, map, features, selectedId, layers.sources, hiddenId, interactive]);

  useEffect(() => {
    const shapes: MapsPolyline[] = [];
    const listeners: MapsListener[] = [];
    for (const feature of layers.pipelines ? features : []) {
      if (
        feature.properties.asset_type !== "pipeline" ||
        feature.geometry.type !== "LineString" ||
        feature.id === hiddenId
      )
        continue;
      const path = feature.geometry.coordinates.map(toPosition);
      const selected = feature.id === selectedId;
      const fade = !interactive
        ? 0.35
        : feature.properties.status === "inactive"
          ? 0.45
          : 1;
      const color = selected
        ? IRRIGATION_COLORS.waterSelected
        : IRRIGATION_COLORS.water;
      const weight = selected ? 5 : 3.5;
      const pattern = pipelinePatterns[feature.properties.pipeline_type];
      const line = (
        options: Omit<
          ConstructorParameters<MapsSDK["Polyline"]>[0],
          "map" | "path" | "geodesic"
        >,
      ) => {
        const polyline = new sdk.Polyline({
          map,
          path,
          geodesic: false,
          clickable: false,
          ...options,
        });
        shapes.push(polyline);
        return polyline;
      };
      if (selected)
        line({
          strokeColor: IRRIGATION_COLORS.glow,
          strokeOpacity: 0.6,
          strokeWeight: 15,
          zIndex: 41,
        });
      // A white casing keeps the line visible on satellite imagery.
      line({
        strokeColor: IRRIGATION_COLORS.casing,
        strokeOpacity: 0.92 * fade,
        strokeWeight: weight + 3,
        zIndex: selected ? 43 : 42,
      });
      line({
        strokeColor: color,
        strokeOpacity: pattern === "solid" ? fade : 0,
        strokeWeight: weight,
        zIndex: selected ? 45 : 44,
        icons: patternIcons(pattern, sdk, color, fade, weight),
      });
      if (interactive) {
        // A wide, nearly invisible line gives a comfortable tap target.
        const target = line({
          strokeColor: IRRIGATION_COLORS.casing,
          strokeOpacity: 0.01,
          strokeWeight: 22,
          clickable: true,
          zIndex: 46,
        });
        listeners.push(
          target.addListener("click", () => select.current(feature.id)),
        );
      }
    }
    return () => {
      listeners.forEach((listener) => listener.remove());
      shapes.forEach((shape) => shape.setMap(null));
    };
  }, [sdk, map, features, selectedId, layers.pipelines, hiddenId, interactive]);

  return null;
}
