type Parameter = string | number | null | { value: string | number | null };
type PropertyGroup = Record<string, Parameter | undefined>;
type PropertyGroups = Record<string, PropertyGroup | undefined>;

export interface SequenceObject {
  speckle_type?: string;
  ifcType?: string;
  category?: string;
  family?: string;
  Family?: string;
  properties?: {
    Parameters?: { "Instance Parameters"?: PropertyGroups };
    "Property Sets"?: PropertyGroups;
  };
}

export interface SequenceProperties {
  mark: string | null;
  originalType: string | null;
  fromCltTag: boolean;
}

export function isIfcElement(obj: SequenceObject): boolean {
  return Boolean(obj.ifcType && obj.speckle_type?.includes("DataObject"));
}

export function isSequenceElement(obj: SequenceObject): boolean {
  return isIfcElement(obj) || Boolean(obj.speckle_type?.includes("RevitObject"));
}

function parameterText(parameter: Parameter | undefined): string | null {
  const value = typeof parameter === "object" && parameter !== null
    ? parameter.value
    : parameter;
  return value === undefined || value === null || value === "" ? null : String(value);
}

function markText(parameter: Parameter | undefined): string | null {
  const text = parameterText(parameter);
  return text === "0" ? null : text;
}

/** Normalize the two supported export formats before building sequence/filter mappings. */
export function readSequenceProperties(obj: SequenceObject): SequenceProperties {
  const ifc = isIfcElement(obj);
  const groups = ifc
    ? obj.properties?.["Property Sets"]
    : obj.properties?.Parameters?.["Instance Parameters"];
  const identity = groups?.["Identity Data"];
  const text = groups?.Text;
  const cltMark = text?.CLT_T_Mark ?? text?.clt_t_mark;
  const category = ifc ? parameterText(groups?.Other?.Category) : obj.category;
  const family = ifc ? parameterText(groups?.Other?.Family) : obj.family ?? obj.Family;
  const fromCltTag = cltMark !== undefined || Boolean(
    category === "Generic Models" && family?.toLowerCase().includes("clt tag")
  );

  return {
    // Tag identifiers can differ from the element Mark: CLT_T_Mark defines the sequence.
    mark: markText(cltMark) ?? markText(identity?.Mark ?? identity?.mark),
    originalType: parameterText(
      identity?.["Original Type"] ?? identity?.["original type"] ??
      identity?.["Type Name"] ?? identity?.["type name"]
    ),
    fromCltTag,
  };
}
