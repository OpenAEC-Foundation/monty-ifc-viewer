/**
 * Read a model as a Speckle server stores it (the root object and everything below it) into elements with meshes
 * and properties. Only reads the common shape: collections with `elements`, objects with a `displayValue` of meshes,
 * arrays split into chunks. Coordinates go from the units of the mesh and Z up to metres and Y up, as the viewer draws.
 */
export type SpeckleObject = { id: string; speckle_type?: string; [key: string]: any };

export interface SpeckleMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

export interface SpeckleElement {
  id: number;
  name: string;
  material: string;
  properties: Record<string, any>;
  meshes: SpeckleMesh[];
}

const TO_METRES: Record<string, number> = {
  mm: 0.001, millimeters: 0.001, cm: 0.01, centimeters: 0.01, m: 1, meters: 1, km: 1000,
  in: 0.0254, inches: 0.0254, ft: 0.3048, feet: 0.3048, yd: 0.9144, yards: 0.9144,
};

const COLLECTION = 'Collectie';

function isReference(value: any): value is { referencedId: string } {
  return !!value && typeof value === 'object' && typeof value.referencedId === 'string';
}

/** A list of numbers, stored inline or as references to chunks with `data`. */
function numbers(list: any, byId: Map<string, SpeckleObject>): number[] {
  if (!Array.isArray(list)) return [];
  if (!list.some((item) => item && typeof item === 'object')) return list;
  const out: number[] = [];
  for (const item of list) {
    const chunk = isReference(item) ? byId.get(item.referencedId) : item;
    if (typeof chunk === 'number') out.push(chunk);
    else if (chunk && Array.isArray(chunk.data)) for (const n of chunk.data) out.push(n);
  }
  return out;
}

function readMesh(mesh: SpeckleObject, byId: Map<string, SpeckleObject>): SpeckleMesh | null {
  const vertices = numbers(mesh.vertices, byId);
  const faces = numbers(mesh.faces, byId);
  if (vertices.length < 9 || !faces.length) return null;
  const scale = TO_METRES[String(mesh.units ?? 'm').toLowerCase()] ?? 1;
  const positions = new Float32Array(vertices.length);
  for (let i = 0; i + 2 < vertices.length; i += 3) {
    positions[i] = vertices[i] * scale;
    positions[i + 1] = vertices[i + 2] * scale;
    positions[i + 2] = -vertices[i + 1] * scale;
  }
  // Faces: a count (0 = triangle, 1 = quad, otherwise the count itself) followed by that many vertex numbers.
  const indices: number[] = [];
  const count = vertices.length / 3;
  for (let i = 0; i < faces.length; ) {
    const n = faces[i] === 0 ? 3 : faces[i] === 1 ? 4 : faces[i];
    if (n < 3 || i + n >= faces.length) break;
    const first = faces[i + 1];
    for (let k = 2; k < n; k++) {
      const b = faces[i + k];
      const c = faces[i + k + 1];
      if (first < count && b < count && c < count) indices.push(first, b, c);
    }
    i += n + 1;
  }
  return indices.length ? { positions, indices: new Uint32Array(indices) } : null;
}

function isMesh(obj: SpeckleObject): boolean {
  return String(obj.speckle_type ?? '').includes('Geometry.Mesh');
}

/** The material name of an element, for the colour: the first property whose name says material. */
function materialOf(properties: Record<string, any>): string {
  for (const [key, value] of Object.entries(properties)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = materialOf(value);
      if (nested) return nested;
    } else if (/^(materiaal|material)$/i.test(key) && typeof value === 'string' && value.trim().length > 1) {
      return value;
    }
  }
  return '';
}

/**
 * The elements of the model, in the order of the collections. `roots` are the ids of the root objects; without them
 * every object that no other object refers to is a root.
 */
export function readSpeckle(objects: SpeckleObject[], roots?: string[]): SpeckleElement[] {
  const byId = new Map<string, SpeckleObject>();
  for (const obj of objects) if (obj && typeof obj.id === 'string') byId.set(obj.id, obj);

  let start = (roots ?? []).filter((id) => byId.has(id));
  if (!start.length) {
    const referenced = new Set<string>();
    for (const obj of objects) for (const id of Object.keys(obj?.__closure ?? {})) referenced.add(id);
    start = [...byId.keys()].filter((id) => !referenced.has(id));
  }

  const elements: SpeckleElement[] = [];
  const seen = new Set<string>();

  const resolve = (value: any): SpeckleObject | null => {
    if (isReference(value)) return byId.get(value.referencedId) ?? null;
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
  };

  const visit = (obj: SpeckleObject, collection: string, depth: number): void => {
    if (depth > 64) return;
    if (obj.id) {
      if (seen.has(obj.id)) return;
      seen.add(obj.id);
    }
    const display = obj.displayValue ?? obj['@displayValue'];
    const meshes: SpeckleMesh[] = [];
    if (isMesh(obj)) {
      const mesh = readMesh(obj, byId);
      if (mesh) meshes.push(mesh);
    } else if (display) {
      for (const item of Array.isArray(display) ? display : [display]) {
        const target = resolve(item);
        const mesh = target && isMesh(target) ? readMesh(target, byId) : null;
        if (mesh) meshes.push(mesh);
      }
    }
    if (meshes.length) {
      const own = obj.properties && typeof obj.properties === 'object' && !Array.isArray(obj.properties) ? obj.properties : {};
      const properties: Record<string, any> = {};
      if (obj.name) properties.Name = String(obj.name);
      if (collection) properties[COLLECTION] = collection;
      Object.assign(properties, own);
      elements.push({ id: elements.length + 1, name: String(obj.name ?? ''), material: materialOf(own), properties, meshes });
    }
    const children = obj.elements ?? obj['@elements'];
    if (Array.isArray(children)) {
      const name = obj.name ? String(obj.name) : collection;
      // The root collection is the model itself: its name says nothing about an element.
      const below = depth === 0 ? '' : name;
      for (const child of children) {
        const target = resolve(child);
        if (target) visit(target, below, depth + 1);
      }
    }
  };

  for (const id of start) visit(byId.get(id)!, '', 0);
  return elements;
}

/** The parameter to run the construction sequence on: Mark as in IFC, else the collection
 * (in an assembly model the step), else a property named step. */
export function sequenceParameter(paths: string[]): string | undefined {
  return (
    paths.find((path) => path.toLowerCase().includes('mark')) ??
    paths.find((path) => path === COLLECTION) ??
    paths.find((path) => /(^|→ )(stap|step)$/i.test(path))
  );
}
