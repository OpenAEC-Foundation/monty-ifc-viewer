import { createSignal } from 'solid-js';
import type { IFCElement, ParameterInfo } from '@/types/ifc';

export const [fileName, setFileName] = createSignal('');
export const [hasFile, setHasFile] = createSignal(false);
export const [modelId, setModelId] = createSignal<number | null>(null);
export const [parameterOptions, setParameterOptions] = createSignal<[string, ParameterInfo][]>([]);
export const [selectedParameter, setSelectedParameter] = createSignal('');
export const [uniqueValuesCount, setUniqueValuesCount] = createSignal('-');
export const [objectsWithParamCount, setObjectsWithParamCount] = createSignal('-');
export const [currentParamLabel, setCurrentParamLabel] = createSignal('');
export const [valuesHeaderText, setValuesHeaderText] = createSignal('');

// Non-reactive data (no need to trigger re-renders)
export let elements: IFCElement[] = [];
export let elementProperties = new Map<number, Record<string, any>>();
export let allParameters = new Map<string, ParameterInfo>();

export function setElements(e: IFCElement[]) { elements = e; }
export function setElementProperties(ep: Map<number, Record<string, any>>) { elementProperties = ep; }
export function setAllParameters(ap: Map<string, ParameterInfo>) { allParameters = ap; }

export function resetIfcStore(): void {
  setFileName('');
  setHasFile(false);
  setModelId(null);
  setParameterOptions([]);
  setSelectedParameter('');
  setUniqueValuesCount('-');
  setObjectsWithParamCount('-');
  setCurrentParamLabel('');
  setValuesHeaderText('');
  elements = [];
  elementProperties = new Map();
  allParameters = new Map();
}
