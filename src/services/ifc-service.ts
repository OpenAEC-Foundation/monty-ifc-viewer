// @ts-ignore - web-ifc types
import * as WebIFC from 'web-ifc';

let ifcApi: any = null;

export async function initIFC(): Promise<void> {
  ifcApi = new WebIFC.IfcAPI();
  ifcApi.SetWasmPath('/');
  await ifcApi.Init();
  console.log('web-ifc initialized');
}

export function getIfcApi(): any {
  return ifcApi;
}

export function openModel(data: Uint8Array): number {
  if (!ifcApi) throw new Error('IFC API not initialized');
  return ifcApi.OpenModel(data);
}

export function closeModel(modelId: number): void {
  if (!ifcApi) return;
  ifcApi.CloseModel(modelId);
}

export function getLine(modelId: number, expressId: number): any {
  return ifcApi.GetLine(modelId, expressId);
}

export function getLineIDsWithType(modelId: number, type: number): any {
  return ifcApi.GetLineIDsWithType(modelId, type);
}

export function getFlatMesh(modelId: number, expressId: number): any {
  return ifcApi.GetFlatMesh(modelId, expressId);
}

export function getGeometry(modelId: number, geometryExpressID: number): any {
  return ifcApi.GetGeometry(modelId, geometryExpressID);
}

export function getVertexArray(data: any, size: number): Float32Array {
  return ifcApi.GetVertexArray(data, size);
}

export function getIndexArray(data: any, size: number): Uint32Array {
  return ifcApi.GetIndexArray(data, size);
}

export { WebIFC };
