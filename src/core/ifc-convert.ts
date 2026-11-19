/**
 * Read an IFC file in the browser (web-ifc) into objects as a Speckle server stores them, so the viewer shows it like
 * a model from Speckle: a collection per IFC type, an object per element with its property sets, meshes in metres with
 * Z up. Used in the SuperCloud workplace for an IFC file from Docs.
 */
import * as WebIFC from "web-ifc";
import wasmUrl from "web-ifc/web-ifc.wasm?url";
import type { SpeckleObject } from "./host";

type Value = { value?: unknown } | null | undefined;
type Line = Record<string, any>;

const MARK_NAMES = new Set(["mark", "marke", "markierung", "merk"]);

function valueOf(value: Value): string | number | boolean | null {
  const inner = value && typeof value === "object" ? value.value : value;
  return typeof inner === "string" || typeof inner === "number" || typeof inner === "boolean" ? inner : null;
}

function typeName(api: WebIFC.IfcAPI, code: number): string {
  const name = api.GetNameFromTypeCode(code) || "IFCPRODUCT";
  // IFCWALLSTANDARDCASE -> IfcWallstandardcase: readable, and the same word for every element of the type.
  return "Ifc" + name.slice(3, 4).toUpperCase() + name.slice(4).toLowerCase();
}

/** Property sets and quantities per element: `{element: {Set: {Name: value}}}`. */
function propertySets(api: WebIFC.IfcAPI, model: number): Map<number, Record<string, Record<string, unknown>>> {
  const out = new Map<number, Record<string, Record<string, unknown>>>();
  const rels = api.GetLineIDsWithType(model, WebIFC.IFCRELDEFINESBYPROPERTIES);
  for (let i = 0; i < rels.size(); i++) {
    try {
      const rel = api.GetLine(model, rels.get(i)) as Line;
      const definition = rel.RelatingPropertyDefinition?.value;
      if (!definition || !Array.isArray(rel.RelatedObjects)) continue;
      const set = api.GetLine(model, definition) as Line;
      const name = String(valueOf(set.Name) ?? "Properties");
      const values: Record<string, unknown> = {};
      for (const ref of set.HasProperties ?? []) {
        const property = api.GetLine(model, ref.value) as Line;
        const key = valueOf(property.Name);
        const value = valueOf(property.NominalValue);
        if (key !== null && value !== null) values[String(key)] = value;
      }
      for (const ref of set.Quantities ?? []) {
        const quantity = api.GetLine(model, ref.value) as Line;
        const key = valueOf(quantity.Name);
        const value = valueOf(quantity.LengthValue ?? quantity.AreaValue ?? quantity.VolumeValue ?? quantity.CountValue ?? quantity.WeightValue);
        if (key !== null && value !== null) values[String(key)] = value;
      }
      if (Object.keys(values).length === 0) continue;
      for (const object of rel.RelatedObjects) {
        const sets = out.get(object.value) ?? {};
        sets[name] = { ...(sets[name] ?? {}), ...values };
        out.set(object.value, sets);
      }
    } catch {
      // a relation that cannot be read: skip it
    }
  }
  return out;
}

/** Name of the type and material per element, for the property panel. */
function related(api: WebIFC.IfcAPI, model: number, relation: number, target: "RelatingType" | "RelatingMaterial"): Map<number, string> {
  const out = new Map<number, string>();
  const rels = api.GetLineIDsWithType(model, relation);
  for (let i = 0; i < rels.size(); i++) {
    try {
      const rel = api.GetLine(model, rels.get(i)) as Line;
      const id = rel[target]?.value;
      if (!id || !Array.isArray(rel.RelatedObjects)) continue;
      const name = valueOf((api.GetLine(model, id) as Line).Name);
      if (name === null) continue;
      for (const object of rel.RelatedObjects) out.set(object.value, String(name));
    } catch {
      // skip
    }
  }
  return out;
}

/**
 * The construction sequence reads Mark and the type from the group Identity Data (as a Revit export names it). An IFC
 * from elsewhere keeps Mark in a set of its own: put what was found there as well.
 */
function withIdentity(sets: Record<string, Record<string, unknown>>, type: string | undefined): Record<string, Record<string, unknown>> {
  const identity: Record<string, unknown> = { ...(sets["Identity Data"] ?? {}) };
  if (identity.Mark === undefined) {
    for (const values of Object.values(sets)) {
      const key = Object.keys(values).find((name) => MARK_NAMES.has(name.toLowerCase()));
      if (key) {
        identity.Mark = values[key];
        break;
      }
    }
  }
  if (identity["Type Name"] === undefined && identity["Original Type"] === undefined && type) identity["Type Name"] = type;
  return Object.keys(identity).length > 0 ? { ...sets, "Identity Data": identity } : sets;
}

export async function ifcToObjects(bytes: Uint8Array, fileName: string): Promise<{ rootId: string; objects: SpeckleObject[] }> {
  const api = new WebIFC.IfcAPI();
  await api.Init(() => wasmUrl, true);
  const model = api.OpenModel(bytes);
  try {
    const sets = propertySets(api, model);
    const types = related(api, model, WebIFC.IFCRELDEFINESBYTYPE, "RelatingType");
    const materials = related(api, model, WebIFC.IFCRELASSOCIATESMATERIAL, "RelatingMaterial");
    const elements: SpeckleObject[] = [];
    const byType = new Map<string, string[]>();
    const materialIds = new Map<string, SpeckleObject>();

    api.StreamAllMeshes(model, (flat) => {
      const expressId = flat.expressID;
      const display: SpeckleObject[] = [];
      for (let g = 0; g < flat.geometries.size(); g++) {
        const placed = flat.geometries.get(g);
        const geometry = api.GetGeometry(model, placed.geometryExpressID);
        const data = api.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
        const index = api.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
        geometry.delete();
        if (index.length === 0) continue;
        // web-ifc: position and normal per vertex, placed with a column-major matrix, Y up. Speckle: Z up.
        const m = placed.flatTransformation;
        const vertices: number[] = new Array((data.length / 6) * 3);
        for (let v = 0, o = 0; v < data.length; v += 6, o += 3) {
          const x = data[v], y = data[v + 1], z = data[v + 2];
          const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
          const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
          const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
          vertices[o] = wx;
          vertices[o + 1] = -wz;
          vertices[o + 2] = wy;
        }
        const faces: number[] = new Array((index.length / 3) * 4);
        for (let f = 0, o = 0; f < index.length; f += 3, o += 4) {
          faces[o] = 3;
          faces[o + 1] = index[f];
          faces[o + 2] = index[f + 1];
          faces[o + 3] = index[f + 2];
        }
        const c = placed.color;
        const to255 = (n: number) => Math.max(0, Math.min(255, Math.round(n * 255)));
        const diffuse = ((255 << 24) | (to255(c.x) << 16) | (to255(c.y) << 8) | to255(c.z)) | 0;
        const key = `${diffuse}:${c.w.toFixed(2)}`;
        let material = materialIds.get(key);
        if (!material) {
          material = {
            id: `ifc-material-${materialIds.size + 1}`,
            speckle_type: "Objects.Other.RenderMaterial",
            name: key,
            diffuse,
            opacity: c.w,
            metalness: 0,
            roughness: 1,
            emissive: -16777216,
          };
          materialIds.set(key, material);
        }
        display.push({
          id: `ifc-${expressId}-mesh-${g}`,
          speckle_type: "Objects.Geometry.Mesh",
          units: "m",
          vertices,
          faces,
          renderMaterial: material,
        });
      }
      if (display.length === 0) return;

      let line: Line = {};
      try {
        line = api.GetLine(model, expressId) as Line;
      } catch {
        // an element without a readable line still shows
      }
      const ifcType = typeName(api, api.GetLineType(model, expressId));
      const type = types.get(expressId);
      const properties: Record<string, unknown> = { "Property Sets": withIdentity(sets.get(expressId) ?? {}, type) };
      const tag = valueOf(line.Tag);
      if (tag !== null) properties.elementId = tag;
      const material = materials.get(expressId);
      if (material) properties.Material = material;
      const id = `ifc-${expressId}`;
      elements.push({
        id,
        speckle_type: "Objects.Data.DataObject",
        applicationId: String(valueOf(line.GlobalId) ?? id),
        name: String(valueOf(line.Name) ?? ifcType),
        ifcType,
        category: ifcType.slice(3),
        properties,
        displayValue: display,
      });
      const list = byType.get(ifcType) ?? [];
      list.push(id);
      byType.set(ifcType, list);
    });

    const collections: SpeckleObject[] = [...byType.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, ids], index) => ({
        id: `ifc-collection-${index + 1}`,
        speckle_type: "Speckle.Core.Models.Collections.Collection",
        name: type.slice(3),
        elements: ids.map((referencedId) => ({ referencedId, speckle_type: "reference" })),
        __closure: Object.fromEntries(ids.map((id) => [id, 1])),
      }));
    const below = [...collections, ...elements];
    const root: SpeckleObject = {
      id: "ifc-root",
      speckle_type: "Speckle.Core.Models.Collections.Collection",
      name: fileName,
      elements: collections.map((collection) => ({ referencedId: collection.id, speckle_type: "reference" })),
      __closure: Object.fromEntries(below.map((object) => [object.id, 1])),
    };
    if (elements.length === 0) throw new Error("Dit IFC-bestand heeft geen geometrie om te tonen.");
    return { rootId: root.id, objects: [root, ...below] };
  } finally {
    api.CloseModel(model);
  }
}
