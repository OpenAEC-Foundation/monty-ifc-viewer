export function naturalSort(a: string, b: string): number {
  const na = parseFloat(a);
  const nb = parseFloat(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}
