export type MaterialType = 'wood' | 'nsi' | 'concrete' | 'steel' | 'glass' | 'default';

export interface IFCElement {
  expressId: number;
  properties: Record<string, string | number>;
}

export interface ParameterInfo {
  values: Set<string>;
  objectIds: Map<string, number[]>;
}

export interface PropertyGroup {
  [key: string]: string | number;
}
