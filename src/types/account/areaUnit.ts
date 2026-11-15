/** Configured application measurements supplied by GET /account/area-units. */
export interface AreaUnit {
  value: string;
  label: string;
  label_hi?: string | null;
  square_meter_factor: string;
  definition?: string | null;
}

export interface AreaUnitsConfig {
  default_unit: string;
  units: AreaUnit[];
}
