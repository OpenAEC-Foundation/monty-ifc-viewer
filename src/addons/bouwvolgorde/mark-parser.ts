import type { IViewer } from "@speckle/viewer";
import { SPECKLE_SERVER } from "../../core/viewer-setup";
import { isIfcElement, isSequenceElement, readSequenceProperties, type SequenceObject, type SequenceProperties } from "./mark-properties";

export interface PhaseMapping {
  /** Sorted unique mark values (phases) */
  phases: string[];
  /** Map from mark value to array of WorldTree node IDs */
  markToIds: Map<string, string[]>;
  /** All element node IDs that have a Mark */
  allMarkedIds: string[];
  /** Element node IDs without a Mark */
  unmarkedIds: string[];
  /** Reverse lookup: node ID → mark value (for selection linking) */
  nodeIdToMark: Map<string, string>;
  /** Map from Original Type value to array of node IDs */
  typeToIds: Map<string, string[]>;
  /** Reverse lookup: node ID → Original Type */
  nodeIdToType: Map<string, string>;
  /** Map from collectie index (100-tal) to array of node IDs (Parts + Generic Models) */
  collectieToIds: Map<number, string[]>;
  /** Node IDs of Generic Models with family "00_CLT TAG" (detected via CLT_T_Mark) */
  cltTagIds: string[];
}

interface ElementInfo {
  nodeId: string;
  object: SequenceObject;
}

/**
 * Parse Mark property from all elements in the model.
 * Reads loaded IFC property sets; fetches parameter groups for Revit exports.
 */
export async function parseMarks(
  viewer: IViewer,
  projectId: string,
  onProgress?: (pct: number) => void
): Promise<PhaseMapping> {
  const tree = viewer.getWorldTree();
  if (!tree) throw new Error("WorldTree not available");

  // Collect elements from both IFC imports and direct Revit connector exports.
  const elements: ElementInfo[] = [];
  const allNodeIds = new Set<string>();
  tree.walk((node) => {
    const raw = node.model?.raw;
    if (raw?.id) {
      allNodeIds.add(raw.id);
      if (isSequenceElement(raw)) {
        elements.push({ nodeId: raw.id, object: raw });
      }
    }
    return true;
  });

  console.log(`Bouwvolgorde: found ${elements.length} elements to scan`);

  // Use the format-specific metadata source for Mark + Type values.
  const markToIds = new Map<string, string[]>();
  const nodeIdToMark = new Map<string, string>();
  const typeToIds = new Map<string, string[]>();
  const nodeIdToType = new Map<string, string>();
  const allMarkedIds: string[] = [];
  const unmarkedIds: string[] = [];
  const cltTagIds: string[] = [];

  // Fetch in parallel batches
  const BATCH_SIZE = 20;
  let completed = 0;

  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((el) => isIfcElement(el.object)
        ? readSequenceProperties(el.object)
        : fetchMarkAndType(projectId, el.nodeId))
    );

    for (let j = 0; j < batch.length; j++) {
      const { mark, originalType, fromCltTag } = results[j];
      const nodeId = batch[j].nodeId;

      if (mark !== null) {
        allMarkedIds.push(nodeId);
        nodeIdToMark.set(nodeId, mark);
        const existing = markToIds.get(mark);
        if (existing) {
          existing.push(nodeId);
        } else {
          markToIds.set(mark, [nodeId]);
        }
        if (fromCltTag) {
          cltTagIds.push(nodeId);
        }
      } else {
        unmarkedIds.push(nodeId);
      }

      if (originalType !== null) {
        nodeIdToType.set(nodeId, originalType);
        const existing = typeToIds.get(originalType);
        if (existing) {
          existing.push(nodeId);
        } else {
          typeToIds.set(originalType, [nodeId]);
        }
      }

    }

    completed += batch.length;
    onProgress?.(completed / elements.length);
  }

  // Sort phases: try numeric, fall back to string sort
  const phases = Array.from(markToIds.keys()).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  // Add all non-marked node IDs to unmarkedIds (generic models, annotations, etc.)
  const markedSet = new Set(allMarkedIds);
  for (const id of allNodeIds) {
    if (!markedSet.has(id) && !unmarkedIds.includes(id)) {
      unmarkedIds.push(id);
    }
  }

  // Build collectie map: group marks per 100 (0-99, 100-199, etc.)
  const collectieToIds = new Map<number, string[]>();
  for (const [mark, ids] of markToIds) {
    const num = parseInt(mark, 10);
    if (isNaN(num)) continue;
    const collectie = Math.floor(num / 100);
    const existing = collectieToIds.get(collectie);
    if (existing) {
      existing.push(...ids);
    } else {
      collectieToIds.set(collectie, [...ids]);
    }
  }

  console.log(
    `Bouwvolgorde: ${phases.length} fases, ` +
    `${allMarkedIds.length} met Mark, ` +
    `${typeToIds.size} types, ` +
    `${collectieToIds.size} collecties, ` +
    `${cltTagIds.length} CLT tags`
  );

  return { phases, markToIds, allMarkedIds, unmarkedIds, nodeIdToMark, typeToIds, nodeIdToType, collectieToIds, cltTagIds };
}

async function fetchMarkAndType(
  projectId: string,
  objectId: string
): Promise<SequenceProperties> {
  const url = `${SPECKLE_SERVER}/objects/${projectId}/${objectId}/single`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Sequence metadata request failed (${response.status}) for object ${objectId}`);
  }
  return readSequenceProperties(await response.json());
}
