import { SPECKLE_SERVER } from "./viewer-setup";
import { getHost, type SpeckleObject } from "./host";

/** The objects of the loaded model when they came in whole (the SuperCloud workplace, an IFC file). */
const loaded = new Map<string, SpeckleObject>();

export function rememberObjects(objects: SpeckleObject[]): void {
  for (const object of objects) if (object && typeof object.id === "string") loaded.set(object.id, object);
}

/** One object with all its properties: from the loaded model, otherwise from the Speckle server. */
export async function fetchObject(projectId: string, objectId: string): Promise<Record<string, unknown> | null> {
  const hit = loaded.get(objectId);
  if (hit) return hit;
  if (getHost() || !projectId) return null;
  const response = await fetch(`${SPECKLE_SERVER}/objects/${projectId}/${objectId}/single`);
  if (!response.ok) throw new Error(`Object request failed (${response.status}) for object ${objectId}`);
  return (await response.json()) as Record<string, unknown>;
}
