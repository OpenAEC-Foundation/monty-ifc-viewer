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
    /** An assembly model: the step an element is mounted in and what kind of part it is. */
    Montage?: PropertyGroup;
  };
}

export interface SequenceProperties {
  mark: string | null;
  originalType: string | null;
  fromCltTag: boolean;
  /** What to call the phase of this element when it has a name of its own (an assembly step). */
  label?: string;
}

export function isIfcElement(obj: SequenceObject): boolean {
  return Boolean(obj.ifcType && obj.speckle_type?.includes("DataObject"));
}

export function isAssemblyElement(obj: SequenceObject): boolean {
  return Boolean(obj.properties?.Montage && obj.speckle_type?.includes("DataObject"));
}

/** Elements whose sequence is in the loaded object itself (no extra request for their parameters). */
export function hasOwnSequence(obj: SequenceObject): boolean {
  return isIfcElement(obj) || isAssemblyElement(obj);
}

export function isSequenceElement(obj: SequenceObject): boolean {
  return hasOwnSequence(obj) || Boolean(obj.speckle_type?.includes("RevitObject"));
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
  const montage = obj.properties?.Montage;
  if (montage && !obj.ifcType) {
    const mark = markText(montage.Stap ?? montage.stap);
    const name = parameterText(montage.Stapnaam ?? montage.stapnaam);
    return {
      mark,
      originalType: parameterText(montage.Soort ?? montage.soort),
      fromCltTag: false,
      label: mark === null ? undefined : name ? `Stap ${mark} · ${name}` : `Stap ${mark}`,
    };
  }
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
