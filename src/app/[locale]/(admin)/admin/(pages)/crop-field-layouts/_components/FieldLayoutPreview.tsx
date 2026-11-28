import { useFormatter, useTranslations } from "next-intl";
import type {
  FieldLayoutConfiguration,
  FieldLayoutDefinition,
} from "@/types/admin/cropFieldLayout";
import {
  applicableConfigurationFields,
  configurationUnit,
  displayConfigurationNumber,
} from "./configuration";

type LayoutPreviewData = {
  definition: FieldLayoutDefinition | undefined;
  configuration: FieldLayoutConfiguration;
};

function useConfigurationValues({
  definition,
  configuration,
}: LayoutPreviewData) {
  const t = useTranslations("cropFieldLayouts.configuration");
  const format = useFormatter();
  if (!definition) return [];

  return applicableConfigurationFields(definition, configuration).map(
    (field) => {
      const value = configuration[field.key];
      const unit = configurationUnit(field);
      const formatted =
        typeof value === "number"
          ? format.number(displayConfigurationNumber(field, value), {
              maximumSignificantDigits: 15,
            })
          : typeof value === "string" && t.has(`values.${value}`)
            ? t(`values.${value}`)
            : value;
      return {
        key: field.key,
        label: field.label,
        value:
          unit && formatted !== undefined
            ? t("measure", { value: formatted, unit })
            : formatted,
      };
    },
  );
}

export function ConfigurationSummary(props: LayoutPreviewData) {
  const t = useTranslations("cropFieldLayouts.configuration");
  const values = useConfigurationValues(props);
  if (!values.length) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300">
        {t(props.definition ? "noSpacing" : "unavailable")}
      </p>
    );
  }

  return (
    <dl className="divide-y divide-gray-200/70 text-sm dark:divide-gray-700/70">
      {values.map(({ key, label, value }) => (
        <div
          key={key}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1.5 first:pt-0 last:pb-0"
        >
          <dt className="text-gray-600 dark:text-gray-300">{label}</dt>
          <dd className="font-medium text-gray-900 dark:text-gray-100">
            {value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function positions(count: number, start: number, end: number) {
  return Array.from({ length: count }, (_, index) =>
    count === 1
      ? (start + end) / 2
      : start + ((end - start) * index) / (count - 1),
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <path
      d="M0 7V1M0 1C-1-5-5-7-9-6c0 4 3 8 9 7Zm0 0C1-5 5-7 9-6c0 4-3 8-9 7Z"
      transform={`translate(${x} ${y})`}
      strokeWidth="1.5"
      strokeLinecap="round"
      className="fill-success-400 stroke-success-700 dark:fill-success-500 dark:stroke-success-300"
    />
  );
}

function CropRows({
  rows,
  plants,
  bounds = [52, 332],
  trellis,
}: {
  rows: number[];
  plants?: number[];
  bounds?: [number, number];
  trellis?: boolean;
}) {
  return rows.map((y) => (
    <g key={y}>
      <path
        d={`M${bounds[0]} ${y}H${bounds[1]}`}
        strokeWidth={plants ? 2 : 7}
        strokeLinecap="round"
        className={
          plants
            ? "stroke-orange-200 dark:stroke-orange-800"
            : "stroke-success-500 dark:stroke-success-400"
        }
      />
      {trellis && (
        <path
          d={`M${bounds[0]} ${y + 8}v-25H${bounds[1]}v25`}
          fill="none"
          strokeWidth="3"
          className="stroke-gray-500 dark:stroke-gray-400"
        />
      )}
      {plants?.map((x) => (
        <Plant key={x} x={x} y={y} />
      ))}
    </g>
  ));
}

function Dimension({
  x,
  y,
  length,
  vertical = false,
  label,
}: {
  x: number;
  y: number;
  length: number;
  vertical?: boolean;
  label?: string;
}) {
  if (!label) return null;
  return (
    <g
      transform={`translate(${x} ${y})`}
      className="text-gray-700 dark:text-gray-200"
    >
      <path
        d={`M0 0H${length}M5-4L0 0l5 4M${length - 5}-4l5 4-5 4`}
        transform={vertical ? "rotate(90)" : undefined}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={vertical ? 8 : length / 2}
        y={vertical ? length / 2 : 18}
        dominantBaseline={vertical ? "middle" : undefined}
        textAnchor={vertical ? "start" : "middle"}
        fontSize="13"
        fontWeight="500"
        fill="currentColor"
      >
        {label}
      </text>
    </g>
  );
}

function drawLayout({
  type,
  configuration,
  measure,
}: {
  type: string;
  configuration: FieldLayoutConfiguration;
  measure: (key: string) => string | undefined;
}) {
  function count(key: string, fallback: number, maximum: number) {
    const value = configuration[key];
    return typeof value === "number" && Number.isFinite(value)
      ? Math.max(1, Math.min(Math.floor(value), maximum))
      : fallback;
  }

  switch (type) {
    case "random_distribution":
      return [
        [65, 63],
        [102, 122],
        [138, 84],
        [173, 153],
        [190, 53],
        [203, 108],
        [232, 78],
        [238, 180],
        [271, 138],
        [278, 61],
        [320, 96],
        [337, 154],
        [368, 63],
        [374, 119],
        [63, 163],
        [124, 181],
      ].map(([x, y]) => <Plant key={x} x={x} y={y} />);
    case "continuous_row":
    case "individual_row":
    case "rectangular":
    case "trellis_based": {
      const gap = type === "rectangular" ? 57 : 46;
      return (
        <>
          <CropRows
            rows={positions(3, 50, 50 + gap * 2)}
            plants={
              type === "continuous_row" ? undefined : positions(7, 60, 324)
            }
            trellis={type === "trellis_based"}
          />
          <Dimension
            x={349}
            y={50}
            length={gap}
            vertical
            label={measure("row_spacing_m")}
          />
          {type !== "continuous_row" && (
            <Dimension
              x={60}
              y={182}
              length={44}
              label={measure("plant_spacing_m")}
            />
          )}
        </>
      );
    }
    case "square":
      return (
        <>
          <CropRows
            rows={[54, 102, 150]}
            plants={positions(6, 104, 344)}
            bounds={[104, 344]}
          />
          <Dimension
            x={104}
            y={180}
            length={48}
            label={measure("planting_distance_m")}
          />
          <Dimension
            x={360}
            y={54}
            length={48}
            vertical
            label={measure("planting_distance_m")}
          />
        </>
      );
    case "raised_bed_multi_row":
    case "floor_bed": {
      const rows = count("rows_per_bed", 2, 5);
      return (
        <>
          {[30, 113].map((top) => (
            <g key={top}>
              <rect
                x="42"
                y={top}
                width="290"
                height="62"
                rx="8"
                className="fill-orange-100 stroke-orange-300 dark:fill-orange-900/60 dark:stroke-orange-600/60"
                strokeWidth="2"
              />
              {type === "raised_bed_multi_row" && (
                <CropRows
                  rows={positions(rows, top + 14, top + 48)}
                  bounds={[54, 320]}
                  plants={
                    configuration.planting_pattern === "continuous_row"
                      ? undefined
                      : positions(7, 62, 312)
                  }
                />
              )}
            </g>
          ))}
          <Dimension
            x={347}
            y={30}
            length={62}
            vertical
            label={measure("bed_width_m")}
          />
          <Dimension
            x={347}
            y={92}
            length={21}
            vertical
            label={measure("path_width_m")}
          />
        </>
      );
    }
    case "pole_based": {
      const plants = count("plants_per_support", 4, 8);
      const angles = positions(plants, 0, Math.PI * 2 * (1 - 1 / plants));
      return (
        <>
          {[64, 146].map((y) =>
            [86, 200, 314].map((x) => (
              <g key={`${x}-${y}`}>
                <circle
                  cx={x}
                  cy={y}
                  r="14"
                  className="fill-gray-500 dark:fill-gray-400"
                />
                {angles.map((angle) => (
                  <Plant
                    x={x + Math.cos(angle) * 25}
                    y={y + Math.sin(angle) * 25}
                    key={angle}
                  />
                ))}
              </g>
            )),
          )}
          <Dimension
            x={86}
            y={187}
            length={114}
            label={measure("support_spacing_m")}
          />
          <Dimension
            x={352}
            y={64}
            length={82}
            vertical
            label={measure("support_row_spacing_m")}
          />
        </>
      );
    }
    case "rack_shelf": {
      const levels = count("levels_per_rack", 3, 4);
      const units = count("units_per_level", 4, 8);
      return (
        <>
          <rect
            x="46"
            y="24"
            width="348"
            height="172"
            fill="none"
            strokeWidth="4"
            className="stroke-gray-500 dark:stroke-gray-400"
          />
          {positions(levels, levels === 1 ? 194 : 64, 194).map((y) => (
            <g key={y}>
              <path
                d={`M46 ${y}h348`}
                strokeWidth="4"
                className="stroke-gray-500 dark:stroke-gray-400"
              />
              {positions(units, 68, 372).map((x) => (
                <rect
                  key={x}
                  x={x - 15}
                  y={y - 23}
                  width="30"
                  height="20"
                  rx={configuration.growing_unit_type === "bag" ? 8 : 2}
                  className="fill-orange-300 stroke-orange-600 dark:fill-orange-700 dark:stroke-orange-300"
                />
              ))}
            </g>
          ))}
        </>
      );
    }
    case "hanging_bag":
      return (
        <>
          <path
            d="M44 45H396"
            strokeWidth="5"
            strokeLinecap="round"
            className="stroke-gray-500 dark:stroke-gray-400"
          />
          {positions(count("units_per_support", 6, 8), 64, 376).map((x) => (
            <g key={x}>
              <path
                d={`M${x} 45v42`}
                strokeWidth="2"
                className="stroke-gray-400 dark:stroke-gray-300"
              />
              <path
                d={`M${x} 82c-26 17-24 60 0 60s26-43 0-60Z`}
                className="fill-orange-300 stroke-orange-600 dark:fill-orange-700 dark:stroke-orange-300"
              />
            </g>
          ))}
        </>
      );
    case "channel_based":
      return [48, 107, 166].map((y) => (
        <g key={y}>
          <rect
            x="42"
            y={y - 12}
            width="356"
            height="24"
            rx="12"
            className="fill-blue-light-100 stroke-blue-light-500 dark:fill-blue-light-900 dark:stroke-blue-light-400"
          />
          {positions(count("sites_per_channel", 6, 12), 61, 379).map((x) => (
            <Plant key={x} x={x} y={y} />
          ))}
        </g>
      ));
    case "grow_bag":
    case "container":
      return [86, 220, 354].map((x) => (
        <g key={x}>
          <rect
            x={x - 54}
            y="69"
            width="108"
            height="76"
            rx={type === "grow_bag" ? 24 : 4}
            className="fill-orange-100 stroke-orange-600 dark:fill-orange-900/60 dark:stroke-orange-400"
            strokeWidth="3"
          />
          {positions(count("plants_per_container", 3, 6), x - 38, x + 38).map(
            (plant, index) => (
              <Plant key={plant} x={plant} y={index % 2 ? 121 : 93} />
            ),
          )}
        </g>
      ));
    case "vertical_tower":
      return [132, 308].map((x) => (
        <g key={x}>
          <rect
            x={x - 22}
            y="25"
            width="44"
            height="166"
            rx="18"
            className="fill-gray-100 stroke-gray-500 dark:fill-gray-700 dark:stroke-gray-400"
            strokeWidth="3"
          />
          {positions(count("sites_per_tower", 4, 7), 45, 170).map(
            (y, index) => (
              <Plant key={y} x={x + (index % 2 ? 16 : -16)} y={y} />
            ),
          )}
        </g>
      ));
    case "tray": {
      const cells = count("cells_per_tray", 24, 40);
      const columns = Math.min(cells, 10);
      return (
        <>
          <rect
            x="35"
            y="29"
            width="370"
            height="164"
            rx="12"
            className="fill-orange-100 stroke-orange-600 dark:fill-orange-900/60 dark:stroke-orange-400"
            strokeWidth="3"
          />
          {Array.from({ length: cells }, (_, index) => (
            <circle
              key={index}
              cx={57 + (index % columns) * 36}
              cy={53 + Math.floor(index / columns) * 38}
              r="13"
              className="fill-orange-300 stroke-orange-600 dark:fill-orange-700 dark:stroke-orange-300"
            />
          ))}
        </>
      );
    }
    default:
      return null;
  }
}

export default function FieldLayoutPreview({
  definition,
  configuration,
  compact = false,
}: LayoutPreviewData & { compact?: boolean }) {
  const t = useTranslations("cropFieldLayouts.configuration");
  const values = useConfigurationValues({ definition, configuration });
  const arrangement =
    definition &&
    drawLayout({
      type: definition.preview_key,
      configuration,
      measure: (key) => {
        const value = values.find((field) => field.key === key)?.value;
        return compact || typeof value !== "string" ? undefined : value;
      },
    });
  if (!definition || !arrangement) {
    return compact ? null : (
      <p className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        {t("previewUnavailable")}
      </p>
    );
  }

  const illustration = (
    <svg
      viewBox="0 0 440 220"
      role={compact ? undefined : "img"}
      aria-label={compact ? undefined : definition.label}
      aria-hidden={compact || undefined}
      className="bg-orange-25 block h-auto w-full rounded-xl border border-orange-100 dark:border-gray-800 dark:bg-gray-900"
    >
      {arrangement}
    </svg>
  );
  if (compact) return illustration;

  return (
    <figure className="space-y-2">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
        {t("preview")}
      </h4>
      {illustration}
      <figcaption className="text-xs text-gray-500 dark:text-gray-400">
        {t("schematicNote")}
      </figcaption>
    </figure>
  );
}
