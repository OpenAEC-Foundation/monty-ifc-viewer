import { WebIFC, getLine, getLineIDsWithType } from './ifc-service';
import type { ParameterInfo } from '@/types/ifc';

export function getElementProperties(modelId: number, expressId: number): Record<string, any> {
  const props: Record<string, any> = {};

  try {
    const line = getLine(modelId, expressId);

    if (line.constructor?.name) props['IFC Type'] = line.constructor.name.replace('IFC', '');
    if (line.Name?.value) props.Name = line.Name.value;
    if (line.Tag?.value) {
      const tag = String(line.Tag.value);
      if (!tag.match(/^\d{6,}$/) && !tag.match(/^[0-9a-f-]{20,}$/i)) props['Tag'] = tag;
    }

    // Material
    try {
      const matRels = getLineIDsWithType(modelId, WebIFC.IFCRELASSOCIATESMATERIAL);
      for (let i = 0; i < matRels.size(); i++) {
        const relId = matRels.get(i);
        const rel = getLine(modelId, relId);

        if (rel.RelatedObjects?.some((obj: any) => obj.value === expressId)) {
          if (rel.RelatingMaterial?.value) {
            const mat = getLine(modelId, rel.RelatingMaterial.value);
            if (mat.Name?.value) props.Material = mat.Name.value;
            if (mat.ForLayerSet?.value) {
              const layerSet = getLine(modelId, mat.ForLayerSet.value);
              if (layerSet.MaterialLayers) {
                for (const layerRef of layerSet.MaterialLayers) {
                  const layer = getLine(modelId, layerRef.value);
                  if (layer.Material?.value) {
                    const layerMat = getLine(modelId, layer.Material.value);
                    if (layerMat.Name?.value) { props.Material = layerMat.Name.value; break; }
                  }
                }
              }
            }
            if (mat.MaterialConstituents) {
              for (const constRef of mat.MaterialConstituents) {
                const constituent = getLine(modelId, constRef.value);
                if (constituent.Material?.value) {
                  const constMat = getLine(modelId, constituent.Material.value);
                  if (constMat.Name?.value) { props.Material = constMat.Name.value; break; }
                }
              }
            }
          }
          break;
        }
      }
    } catch (_) {}

    // Type info
    try {
      const typeRels = getLineIDsWithType(modelId, WebIFC.IFCRELDEFINESBYTYPE);
      for (let i = 0; i < typeRels.size(); i++) {
        const relId = typeRels.get(i);
        const rel = getLine(modelId, relId);

        if (rel.RelatedObjects?.some((obj: any) => obj.value === expressId)) {
          if (rel.RelatingType?.value) {
            const typeObj = getLine(modelId, rel.RelatingType.value);
            if (typeObj.Name?.value) props['Type Name'] = typeObj.Name.value;
            if (typeObj.ElementType?.value) props['Element Type'] = typeObj.ElementType.value;
            if (typeObj.Tag?.value) props['Type Mark'] = typeObj.Tag.value;
            break;
          }
        }
      }
    } catch (_) {}

    // Property sets
    try {
      const propRels = getLineIDsWithType(modelId, WebIFC.IFCRELDEFINESBYPROPERTIES);
      for (let i = 0; i < propRels.size(); i++) {
        const relId = propRels.get(i);
        try {
          const rel = getLine(modelId, relId);
          if (!rel.RelatedObjects?.some((obj: any) => obj.value === expressId)) continue;

          if (rel.RelatingPropertyDefinition?.value) {
            const psetId = rel.RelatingPropertyDefinition.value;
            const pset = getLine(modelId, psetId);
            const psetName = pset.Name?.value || 'Properties';

            if (pset.HasProperties) {
              for (const propRef of pset.HasProperties) {
                try {
                  const prop = getLine(modelId, propRef.value);
                  const propName = prop.Name?.value;
                  let propValue = null;
                  if (prop.NominalValue?.value !== undefined) propValue = prop.NominalValue.value;

                  if (propName && propValue !== null && propValue !== undefined) {
                    props[`${psetName} → ${propName}`] = propValue;
                    const propNameLower = propName.toLowerCase();
                    if (propNameLower === 'mark' || propNameLower === 'marke' || propNameLower === 'markierung') props['Mark'] = propValue;
                    if (propNameLower.includes('original') && propNameLower.includes('type')) props['Original Type'] = propValue;
                  }
                } catch (_) {}
              }
            }

            if (pset.Quantities) {
              for (const qRef of pset.Quantities) {
                try {
                  const q = getLine(modelId, qRef.value);
                  const qName = q.Name?.value;
                  const qValue = q.LengthValue?.value || q.AreaValue?.value || q.VolumeValue?.value || q.CountValue?.value || q.WeightValue?.value;
                  if (qName && qValue !== undefined) props[`${psetName} → ${qName}`] = qValue;
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  } catch (_) {}

  return props;
}

export function extractParams(
  obj: Record<string, any>,
  prefix: string,
  expressId: number,
  allParameters: Map<string, ParameterInfo>,
): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (key.startsWith('_')) continue;

    const path = prefix ? `${prefix} → ${key}` : key;

    if (typeof value === 'object' && !Array.isArray(value)) {
      extractParams(value, path, expressId, allParameters);
    } else {
      const str = String(value);
      if (!str || str === 'null' || str === 'undefined' || str.length > 200) continue;
      if (str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) continue;
      if (str.match(/^[0-9a-f]{20,}$/i)) continue;

      if (!allParameters.has(path)) {
        allParameters.set(path, { values: new Set(), objectIds: new Map() });
      }
      const param = allParameters.get(path)!;
      param.values.add(str);
      if (!param.objectIds.has(str)) param.objectIds.set(str, []);
      param.objectIds.get(str)!.push(expressId);
    }
  }
}

export function extractAllProperties(
  modelId: number,
  meshes: Map<number, any[]>,
): {
  elements: { expressId: number; properties: Record<string, any> }[];
  elementProperties: Map<number, Record<string, any>>;
  allParameters: Map<string, ParameterInfo>;
} {
  const elements: { expressId: number; properties: Record<string, any> }[] = [];
  const elementProperties = new Map<number, Record<string, any>>();
  const allParameters = new Map<string, ParameterInfo>();

  for (const [expressId] of meshes) {
    const props = getElementProperties(modelId, expressId);
    (props as any).expressId = expressId;
    elements.push({ expressId, properties: props });
    elementProperties.set(expressId, props);
    extractParams(props, '', expressId, allParameters);
  }

  return { elements, elementProperties, allParameters };
}

export function sortParameters(
  allParameters: Map<string, ParameterInfo>,
): [string, ParameterInfo][] {
  return [...allParameters.entries()]
    .filter(([, info]) => info.values.size > 1 && info.values.size < 100)
    .sort((a, b) => {
      const aName = a[0].toLowerCase();
      const bName = b[0].toLowerCase();
      if (aName.includes('mark') && !bName.includes('mark')) return -1;
      if (bName.includes('mark') && !aName.includes('mark')) return 1;
      return a[1].values.size - b[1].values.size;
    });
}
