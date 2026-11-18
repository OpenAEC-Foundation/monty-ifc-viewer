# Catalogus met 3D-opslagveld — Implementatieplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een knop Catalogus die per categorie en plaatsoort toont wat er nodig is om het gebouw te bouwen, met een 3D-opslagveld naast het gebouw dat leegloopt naarmate de bouwvolgorde vordert.

**Architecture:** Twee pure modules (`catalog-data.ts`, `field-layout.ts`) bevatten alle rekenregels en zijn met `node --test` te testen. `stock-field.ts` zet de platen als eigen three.js-objecten op laag `ObjectLayers.PROPS` in `viewer.getRenderer().scene`; de Speckle-viewer zelf blijft ongewijzigd. `PhaseManager` krijgt een expliciete bouwstand (start / fase / compleet) met een abonnement, waar tijdlijn, veld en paneel op reageren.

**Tech Stack:** TypeScript strict, Vite 5, `@speckle/viewer` 2.25.4, `three` 0.140.2, `node --test`, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-catalogus-opslagveld-design.md`

## Global Constraints

- Speckle-viewer niet wijzigen: alleen publieke API (`getRenderer().scene`, `getRenderer().renderingCamera`, `getWorldTree().getRenderTree().getRenderViewsForNodeId()`, `CameraController.setCameraView(box3, true)`, `FilteringExtension`).
- Eigen 3D-objecten op `ObjectLayers.PROPS` (2), nooit op `STREAM_CONTENT_MESH`: Speckle's klikdetectie raycast op die laag.
- `three` exact `0.140.2` (dezelfde als de viewer), `@types/three` `~0.140.0` als devDependency.
- Pure modules (`catalog-data.ts`, `field-layout.ts`, `build-state.ts`) hebben **geen runtime-imports**, alleen `import type`: de tests transpileren elk bestand los en laden het via een data-URL (zie `tests/mark-properties.test.mjs`).
- Scène-eenheid in het voorbeeldproject: meter, Z omhoog. Property-maten zijn mm, `Volume` is m³.
- Teksten in het Nederlands; getallen met `toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })` voor m³.
- Geen namen van externe software in code, comments of commits.
- Elke commit eindigt met `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Referentiewaarden voorbeeldproject (`/demo/pr1`, project `5e0fe816a2`)

| Wat | Waarde |
|-----|--------|
| Onderdelen | 390 (388 met Mark, 2 zonder) |
| Groepen in volgorde | Wanden 200, Vloeren 59, Dak 28, Stelkozijnen 101, Zonder fase 2 |
| Stapels (excl. Zonder fase) | 18 |
| Totaal volume | 148,0 m³ |
| Fase 0 (Mark 1) | 1 onderdeel: Wanden › `100-03s-1-TT` (14 stuks) |
| Gebouw | x-extent 15,0, y-extent 19,6 (lange as = y), laagste z = −3,32 |

## Review Focus

1. **Model zonder fases** (geen enkele Mark): catalogus moet tóch verschijnen als vaste lijst met vol veld; alles in gewone stapels, geen "Zonder fase"-groep. → test in Task 1 (`buildCatalog` zonder fases) en Task 4 (catalogus wordt ook aangemaakt als `phases.length === 0`).
2. **Catalogus sluiten in de startstand** laat het gebouw anders volledig geghost achter; verwacht: gebouw weer compleet (reset). → browsertest Task 4.
3. **Herhaald openen/sluiten** mag geen objecten of labels achterlaten. → browsertest Task 4 (3× openen/sluiten, geen `catalogus-veld` in de scène, geen `.cat-label` in de DOM).
4. **Ontbrekende maten** (geen Dimensions, geen bounding box, onbekende plaatsoort) mogen niet tot NaN of platen van 0 groot leiden. → unittests Task 1 en Task 2.
5. **Slepen/draaien van de camera over een stapel** mag de blauwe markering niet aan- of uitzetten; alleen een echte klik (beweging < 5 px). → browsertest Task 5.

---

### Task 1: Catalogusdata (puur)

**Files:**
- Create: `src/addons/bouwvolgorde/build-state.ts`
- Create: `src/addons/catalogus/catalog-data.ts`
- Test: `tests/catalog-data.test.mjs`

**Interfaces:**
- Produces (`build-state.ts`):
  ```ts
  export type BuildState =
    | { kind: "start" }                    // nog niets gebouwd
    | { kind: "phase"; index: number }     // fases 0..index gebouwd
    | { kind: "complete" };                // reset: alles staat
  ```
- Produces (`catalog-data.ts`):
  ```ts
  export const UNPHASED_LABEL = "Zonder fase";
  export const UNKNOWN_TYPE = "Onbekende soort";
  export interface CatalogSource {
    category?: string; family?: string;
    properties?: { "Property Sets"?: Record<string, Record<string, unknown> | undefined> };
  }
  export interface CatalogPart {
    nodeId: string; category: string; plateType: string; phaseIndex: number | null;
    volume: number; thicknessMm: number | null; lengthMm: number | null; widthMm: number | null;
  }
  export interface CatalogStack { key: string; category: string; plateType: string; parts: CatalogPart[] } // key = `${category}|${plateType}`
  export interface CatalogGroup { category: string; stacks: CatalogStack[] }
  export interface Catalog { groups: CatalogGroup[]; unphased: CatalogStack | null; phased: boolean; totalParts: number; totalVolume: number }
  export interface StockCount { remaining: number; total: number; remainingVolume: number }
  export function categoryLabel(originalCategory: string | null, originalFamily: string | null): string;
  export function thicknessFromType(plateType: string): number | null;
  export function readCatalogPart(nodeId: string, raw: CatalogSource, originalType: string | null, phaseIndex: number | null): CatalogPart;
  export function buildCatalog(parts: CatalogPart[]): Catalog;
  export function isOnField(part: CatalogPart, state: BuildState): boolean;
  export function stockCount(parts: CatalogPart[], state: BuildState): StockCount;
  ```

Regels:
- `categoryLabel`: Walls → `Wanden`, Floors → `Vloeren`, Roofs → `Dak`; Generic Models met familie → familie zonder volgnummer aan het eind + `en` (`Stelkozijn 2` → `Stelkozijnen`); al het andere (ook Generic Models zonder familie) → `Overig`.
- `thicknessFromType`: eerste drie cijfers vóór het eerste `-` (`/^(\d{3})-/`), anders `null`.
- `readCatalogPart`: leest uit `Property Sets` → `Identity Data` (`Original Category`, `Original Family`) en `Dimensions` (`Thickness`, `Length`, `Height` → `widthMm`, `Volume`). Zonder `Property Sets` (Revit-export): `raw.category` / `raw.family`. `thicknessMm = Thickness ?? thicknessFromType(plateType)`. `plateType = originalType ?? UNKNOWN_TYPE`. Ontbrekend volume → `0`.
- `buildCatalog`: `phased = parts.some(p => p.phaseIndex !== null)`. Als `phased`: onderdelen met `phaseIndex === null` gaan naar `unphased` (category `UNPHASED_LABEL`, plateType `""`, key `"unphased"`), anders `unphased = null` en alles in gewone stapels. Groepvolgorde: Wanden, Vloeren, Dak, dan overige alfabetisch, `Overig` als laatste. Stapels binnen een groep op plaatsoort (`localeCompare(…, "nl", { numeric: true })`).
- `isOnField`: `phaseIndex === null` → altijd `true`; anders `start` → `true`, `phase` → `phaseIndex > index`, `complete` → `false`.

- [ ] **Step 1: Schrijf de falende tests** in `tests/catalog-data.test.mjs` met hetzelfde transpile-patroon als `tests/mark-properties.test.mjs` (`build-state.ts` hoeft niet geladen: alleen type-import).

```js
test('categoryLabel maps Revit categories to Dutch groups', () => {
  assert.equal(categoryLabel('Walls', null), 'Wanden');
  assert.equal(categoryLabel('Floors', null), 'Vloeren');
  assert.equal(categoryLabel('Roofs', null), 'Dak');
  assert.equal(categoryLabel('Generic Models', 'Stelkozijn 2'), 'Stelkozijnen');
  assert.equal(categoryLabel('Generic Models', 'Stelkozijn'), 'Stelkozijnen');
  assert.equal(categoryLabel('Generic Models', null), 'Overig');
  assert.equal(categoryLabel('Doors', 'Deur'), 'Overig');
});
test('thicknessFromType reads the leading millimetres', () => {
  assert.equal(thicknessFromType('080-03s-1-TL'), 80);
  assert.equal(thicknessFromType('280-07ss-1-TL'), 280);
  assert.equal(thicknessFromType('Onbekende soort'), null);
});
test('readCatalogPart reads IFC property sets', () => {
  const wall = { properties: { 'Property Sets': {
    'Identity Data': { 'Original Category': 'Walls', 'Original Family': 'Basic Wall' },
    Dimensions: { Length: 3056, Height: 316, Thickness: 100, Volume: 0.0949896 } } } };
  assert.deepEqual(readCatalogPart('w', wall, '100-05s-1-TT', 3), {
    nodeId: 'w', category: 'Wanden', plateType: '100-05s-1-TT', phaseIndex: 3,
    volume: 0.0949896, thicknessMm: 100, lengthMm: 3056, widthMm: 316 });
  const roof = { properties: { 'Property Sets': {
    'Identity Data': { 'Original Category': 'Roofs' }, Dimensions: { Volume: 1.392 } } } };
  const r = readCatalogPart('r', roof, '080-03s-1-TL', 0);
  assert.equal(r.thicknessMm, 80); assert.equal(r.lengthMm, null); assert.equal(r.widthMm, null);
  const bare = readCatalogPart('b', {}, null, null);
  assert.equal(bare.category, 'Overig'); assert.equal(bare.plateType, 'Onbekende soort');
  assert.equal(bare.volume, 0); assert.equal(bare.thicknessMm, null);
});
test('buildCatalog groups, orders and separates unphased parts', () => {
  const p = (id, category, plateType, phaseIndex, volume = 1) =>
    ({ nodeId: id, category, plateType, phaseIndex, volume, thicknessMm: 100, lengthMm: null, widthMm: null });
  const c = buildCatalog([p('a', 'Overig', 'x', 5), p('b', 'Dak', '080', 1), p('c', 'Wanden', '100-05', 0),
    p('d', 'Wanden', '060-03', 2), p('e', 'Wanden', '100-05', null), p('f', 'Stelkozijnen', '060', 3)]);
  assert.deepEqual(c.groups.map(g => g.category), ['Wanden', 'Dak', 'Stelkozijnen', 'Overig']);
  assert.deepEqual(c.groups[0].stacks.map(s => s.key), ['Wanden|060-03', 'Wanden|100-05']);
  assert.deepEqual(c.unphased.parts.map(x => x.nodeId), ['e']);
  assert.equal(c.unphased.key, 'unphased'); assert.equal(c.phased, true);
  assert.equal(c.totalParts, 6); assert.equal(c.totalVolume, 6);
});
test('buildCatalog without any phase keeps everything in regular stacks', () => {
  const p = (id, t) => ({ nodeId: id, category: 'Wanden', plateType: t, phaseIndex: null, volume: 1, thicknessMm: 100, lengthMm: null, widthMm: null });
  const c = buildCatalog([p('a', 'x'), p('b', 'y')]);
  assert.equal(c.phased, false); assert.equal(c.unphased, null);
  assert.equal(c.groups[0].stacks.length, 2);
});
test('stockCount follows the build state, duplicate phases leave together', () => {
  const p = (id, phaseIndex, volume) => ({ nodeId: id, category: 'Wanden', plateType: 'x', phaseIndex, volume, thicknessMm: 100, lengthMm: null, widthMm: null });
  const parts = [p('a', 0, 1), p('b', 1, 2), p('c', 1, 3), p('d', null, 4)];
  assert.deepEqual(stockCount(parts, { kind: 'start' }), { remaining: 4, total: 4, remainingVolume: 10 });
  assert.deepEqual(stockCount(parts, { kind: 'phase', index: 0 }), { remaining: 3, total: 4, remainingVolume: 9 });
  assert.deepEqual(stockCount(parts, { kind: 'phase', index: 1 }), { remaining: 1, total: 4, remainingVolume: 4 });
  assert.deepEqual(stockCount(parts, { kind: 'complete' }), { remaining: 1, total: 4, remainingVolume: 4 });
});
```

- [ ] **Step 2:** `node --test tests/catalog-data.test.mjs` → FAIL (bestand bestaat niet).
- [ ] **Step 3:** Maak `build-state.ts` en implementeer `catalog-data.ts` volgens de interfaces en regels hierboven.
- [ ] **Step 4:** `npm test` → alle tests PASS (ook de bestaande).
- [ ] **Step 5: Commit** — `git add src/addons/bouwvolgorde/build-state.ts src/addons/catalogus/catalog-data.ts tests/catalog-data.test.mjs && git commit -m "feat(catalogus): catalogusdata per categorie en plaatsoort"`

---

### Task 2: Indeling van het opslagveld (puur)

**Files:**
- Create: `src/addons/catalogus/field-layout.ts`
- Test: `tests/field-layout.test.mjs`

**Interfaces:**
- Produces:
  ```ts
  export const FIELD_GAP_M = 3;       // tussenruimte gebouw–veld
  export const STACK_SPACING_M = 1;   // tussen stapels en tussen rijen
  export interface Bounds { minX: number; maxX: number; minY: number; maxY: number; minZ: number }
  export interface PlateSize { length: number; width: number; thickness: number }   // scène-eenheden
  export interface SizeInput { thicknessMm: number | null; lengthMm: number | null; widthMm: number | null; volume: number; aabbSize: [number, number, number] | null }
  export interface StackInput { key: string; row: string; plates: Array<{ nodeId: string; phaseIndex: number | null; size: PlateSize }> }
  export interface PlacedPlate { nodeId: string; stackKey: string; center: [number, number, number]; size: PlateSize; lengthAlongX: boolean }
  export interface PlacedStack { key: string; labelAnchor: [number, number, number]; footprint: { minX: number; maxX: number; minY: number; maxY: number } }
  export interface FieldLayout { plates: PlacedPlate[]; stacks: PlacedStack[]; bounds: Bounds & { maxZ: number } }
  export function detectUnitsPerMm(samples: Array<{ lengthMm: number; largestSide: number }>): number;
  export function plateSize(input: SizeInput, unitsPerMm: number): PlateSize;
  export function layoutField(stacks: StackInput[], building: Bounds, unitsPerMm: number): FieldLayout;
  ```

Regels:
- `detectUnitsPerMm`: mediaan van `largestSide / lengthMm`, afgerond naar de dichtstbijzijnde van `[0.001, 0.01, 0.1, 1]` (log-schaal); lege lijst → `0.001`.
- `plateSize`: dikte = `thicknessMm * u`, anders kleinste zijde van `aabbSize`, anders `100 * u`. Lengte/breedte = `lengthMm`/`widthMm` (×u, langste = length) als beide er zijn; anders de twee grootste zijden van `aabbSize`, geschaald met factor `s = sqrt((volume·1e9·u³ / dikte) / (a·b))` als `volume > 0`, anders ongeschaald; zonder `aabbSize` → `1000·u × 1000·u`. Resultaat altijd eindig en > 0.
- `layoutField`: lange as = x als x-extent ≥ y-extent, anders y. Het veld ligt aan de positieve kant van de korte as, beginnend op `max + FIELD_GAP_M·1000·u`. Een rij per unieke `row` (in invoervolgorde), rijen lopen evenwijdig aan de lange as, beginnend bij de min van de lange as. Stapels in invoervolgorde, voetafdruk = max lengte × max breedte van hun platen, plaatlengte langs de lange as. Rijdiepte = grootste stapelbreedte in die rij. Tussenruimte `STACK_SPACING_M·1000·u`. Stapelvolgorde van onder naar boven: `phaseIndex === null` onderop, dan aflopende `phaseIndex`, zodat de eerst te bouwen plaat bovenop ligt. Onderkant van de stapel = `building.minZ`. `labelAnchor` = midden van de voetafdruk, 0,3 m boven de bovenste plaat.

- [ ] **Step 1: Schrijf de falende tests** (zelfde transpile-patroon):

```js
const u = 0.001;
test('detectUnitsPerMm recognises metres and millimetres', () => {
  assert.equal(detectUnitsPerMm([{ lengthMm: 3056, largestSide: 3.056 }]), 0.001);
  assert.equal(detectUnitsPerMm([{ lengthMm: 3056, largestSide: 3056 }]), 1);
  assert.equal(detectUnitsPerMm([]), 0.001);
});
test('plateSize uses property dimensions when complete', () => {
  const s = plateSize({ thicknessMm: 100, lengthMm: 3056, widthMm: 316, volume: 0.095, aabbSize: [3.056, 0.1, 0.316] }, u);
  assert.ok(Math.abs(s.length - 3.056) < 1e-9 && Math.abs(s.width - 0.316) < 1e-9 && Math.abs(s.thickness - 0.1) < 1e-9);
});
test('plateSize scales the bounding box to the volume', () => {
  const s = plateSize({ thicknessMm: 80, lengthMm: null, widthMm: null, volume: 1.392, aabbSize: [4, 3, 1] }, u);
  assert.ok(Math.abs(s.length * s.width * s.thickness - 1.392) < 1e-6);
  assert.ok(Math.abs(s.length / s.width - 4 / 3) < 1e-9);
});
test('plateSize never returns zero or NaN', () => {
  for (const input of [
    { thicknessMm: null, lengthMm: null, widthMm: null, volume: 0, aabbSize: null },
    { thicknessMm: null, lengthMm: null, widthMm: null, volume: 0, aabbSize: [2, 1, 0.2] },
    { thicknessMm: 60, lengthMm: null, widthMm: null, volume: 0, aabbSize: null },
  ]) {
    const s = plateSize(input, u);
    for (const v of [s.length, s.width, s.thickness]) assert.ok(Number.isFinite(v) && v > 0);
  }
  assert.ok(Math.abs(plateSize({ thicknessMm: null, lengthMm: null, widthMm: null, volume: 0, aabbSize: [2, 1, 0.2] }, u).thickness - 0.2) < 1e-9);
});
test('layoutField places non-overlapping stacks beside the long side', () => {
  const building = { minX: 0, maxX: 15, minY: 0, maxY: 19.6, minZ: -3.32 };
  const plate = (id, phaseIndex, length = 3, width = 1) => ({ nodeId: id, phaseIndex, size: { length, width, thickness: 0.1 } });
  const layout = layoutField([
    { key: 'W|a', row: 'Wanden', plates: [plate('1', 2), plate('2', 0), plate('3', null)] },
    { key: 'W|b', row: 'Wanden', plates: [plate('4', 1, 5, 2)] },
    { key: 'V|a', row: 'Vloeren', plates: [plate('5', 3, 8, 3)] },
    { key: 'V|b', row: 'Vloeren', plates: [plate('6', 4)] },
  ], building, u);
  for (const s of layout.stacks) assert.ok(s.footprint.minX >= 15 + 3 - 1e-9);
  for (let i = 0; i < layout.stacks.length; i++) for (let j = i + 1; j < layout.stacks.length; j++) {
    const a = layout.stacks[i].footprint, b = layout.stacks[j].footprint;
    assert.ok(a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY, `${i} overlapt ${j}`);
  }
  const z = id => layout.plates.find(p => p.nodeId === id).center[2];
  assert.ok(z('2') > z('1') && z('1') > z('3'));               // fase 0 bovenop, zonder fase onderop
  assert.ok(Math.abs(z('3') - 0.05 - (-3.32)) < 1e-9);          // stapel staat op maaiveld
  assert.ok(layout.plates.every(p => p.lengthAlongX === false)); // lange as = y
});
```

- [ ] **Step 2:** `node --test tests/field-layout.test.mjs` → FAIL.
- [ ] **Step 3:** Implementeer `field-layout.ts` volgens interfaces en regels.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(catalogus): indeling van het opslagveld`

---

### Task 3: Bouwstand in PhaseManager en tijdlijn

**Files:**
- Modify: `src/addons/bouwvolgorde/phase-manager.ts`
- Modify: `src/addons/bouwvolgorde/timeline-ui.ts`
- Modify: `src/main.ts` (debug-handle)
- Test: `tests/construction-sequence.browser.mjs`

**Interfaces:**
- Consumes: `BuildState` uit `build-state.ts` (Task 1).
- Produces (op `PhaseManager`):
  ```ts
  get state(): BuildState;                                   // start | phase | complete
  showStart(): void;                                         // niets gebouwd, alles geghost
  onChange(listener: (state: BuildState) => void): () => void; // retourneert unsubscribe
  ```
  `window.__bouwvolgorde = manager` (naast het bestaande `window.__instance`).

Gedrag:
- Nieuwe interne vlag voor de startstand. `state`: startvlag → `start`; `_currentPhase >= 0` → `phase`; anders `complete`. Beginwaarde na aanmaken: `complete` (huidige gedrag: gebouw compleet, speler inactief).
- `showStart()`: `removeUserObjectColors()`, `resetFilters()`, `hideObjects(mapping.allMarkedIds.concat(mapping.unmarkedIds), undefined, true, true)`, dan `applyCltOverlay`, `requestRender()`. `_currentPhase = -1`.
- `setPhase`, `reset`, `showStart` wissen/zetten de startvlag en roepen alle listeners aan met de nieuwe `state`. `next()` vanuit de startstand gaat naar fase 0.
- `timeline-ui.ts`: abonneert zich via `onChange` en werkt daarin label en slider bij: `start` → label `Start — nog niets gebouwd`, slider `0`; `phase` → label `Mark <naam>`, slider = index; `complete` → label `Bouwvolgorde gereset`, slider `0`. De losse `updateLabel()`-aanroepen en de label-update in de reset-handler vervallen. Het beginlabel `Bouwvolgorde — N fases` blijft.

- [ ] **Step 1: Breid de browsertest uit** — na `console.log('Sequence reset passed.');`:

```js
const elementIds = () => page.evaluate(() => {
  const ids = [];
  window.__instance.viewer.getWorldTree().walk(node => {
    const raw = node.model?.raw;
    if (raw?.ifcType && raw.speckle_type?.includes('DataObject')) ids.push(raw.id);
    return true;
  });
  return ids;
});
await page.evaluate(() => window.__bouwvolgorde.showStart());
assert.equal(await page.locator('.bv-label').textContent(), 'Start — nog niets gebouwd');
assert.equal(await page.evaluate(() => window.__bouwvolgorde.state.kind), 'start');
const hidden = new Set((await filtering()).hiddenObjects ?? []);
assert.ok((await elementIds()).every(id => hidden.has(id)), 'startstand ghost alle onderdelen');
await page.getByTitle('Volgende fase').click();
assert.equal(await page.locator('.bv-label').textContent(), 'Mark 1');
await page.getByTitle('Reset bouwvolgorde').click();
assert.equal(await page.evaluate(() => window.__bouwvolgorde.state.kind), 'complete');
console.log('Start state passed.');
```

- [ ] **Step 2:** Start de dev-server (`npm run dev`, poort 3052) en draai `MONTY_BASE_URL=http://localhost:3052 CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run test:browser` → FAIL op `__bouwvolgorde`.
- [ ] **Step 3:** Implementeer `state`, `showStart`, `onChange` in `PhaseManager`, het abonnement in `timeline-ui.ts`, en `window.__bouwvolgorde` in `initBouwvolgorde` in `main.ts`.
- [ ] **Step 4:** Browsertest → PASS (ook alle bestaande stappen), `npm run build` → geen fouten, `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(bouwvolgorde): startstand en fase-abonnement`

---

### Task 4: Opslagveld in 3D met Catalogus-knop

**Files:**
- Modify: `package.json`, `package-lock.json` (`npm install three@0.140.2` en `npm install -D @types/three@~0.140.0`)
- Create: `src/addons/catalogus/stock-field.ts`
- Create: `src/addons/catalogus/catalogus.ts`
- Create: `src/addons/catalogus/index.ts` (exporteert `createCatalogus`)
- Modify: `src/main.ts` (`initBouwvolgorde`)
- Modify: `src/style.css` (`.cat-label`)
- Test: `tests/construction-sequence.browser.mjs`

**Interfaces:**
- Consumes: Task 1 (`readCatalogPart`, `buildCatalog`, `isOnField`, `stockCount`), Task 2 (`detectUnitsPerMm`, `plateSize`, `layoutField`), Task 3 (`PhaseManager.state/showStart/onChange`), `PhaseMapping` (`nodeIdToMark`, `nodeIdToType`, `phases`, `cltTagIds`), `isSequenceElement` uit `mark-properties.ts`.
- Produces:
  ```ts
  // stock-field.ts
  export class StockField {
    constructor(instance: ViewerInstance, container: HTMLElement /* #viewer-container */, overlay: HTMLElement);
    show(layout: FieldLayout): void;
    setOnField(nodeIds: ReadonlySet<string>): void;   // overige platen onzichtbaar
    setLabel(stackKey: string, text: string): void;
    setSelected(stackKey: string | null): void;       // stapel blauw (#3b82f6)
    onStackClick(listener: (stackKey: string) => void): void;
    screenPosition(stackKey: string): { x: number; y: number } | null; // viewport-pixels
    get visiblePlateCount(): number;
    get bounds(): Box3;                                // veld
    hide(): void;                                      // alles weg, alles disposed
  }
  // catalogus.ts
  export interface CatalogusDeps { instance: ViewerInstance; mapping: PhaseMapping; manager: PhaseManager | null; overlay: HTMLElement; container: HTMLElement }
  export interface CatalogusHandle { button: HTMLButtonElement; isOpen(): boolean; visiblePlateCount(): number; screenPosition(stackKey: string): { x: number; y: number } | null }
  export function createCatalogus(deps: CatalogusDeps): CatalogusHandle | null; // null als er geen onderdelen zijn
  ```

Gedrag:
- `StockField.show`: één `Group` met naam `catalogus-veld` in `getRenderer().scene`; per plaat een `Mesh` met gedeelde `BoxGeometry(1,1,1)` geschaald naar de plaatmaten (lengte langs x als `lengthAlongX`, anders langs y), `layers.set(ObjectLayers.PROPS)`, materiaal `MeshStandardMaterial` kleur `#c9a26b`; geselecteerde stapel krijgt een tweede materiaal `#3b82f6`. Labels als `div.cat-label` in `overlay`, elke animation frame geprojecteerd met `getRenderer().renderingCamera` (verborgen als achter de camera). Klik: `pointerdown`/`pointerup` op `container`, alleen bij verplaatsing < 5 px; `Raycaster` met `raycaster.layers.set(ObjectLayers.PROPS)`. Na elke wijziging `viewer.requestRender()`.
- `createCatalogus`: verzamelt onderdelen door de world tree te lopen (`isSequenceElement(raw)`, niet in `cltTagIds`), `phaseIndex` via `nodeIdToMark` → index in `phases`, `originalType` via `nodeIdToType`, `aabbSize` uit `getRenderViewsForNodeId(id)[0].aabb`. Gebouwgrenzen = unie van die aabb's. `unitsPerMm = detectUnitsPerMm(...)` over de onderdelen met `lengthMm` én aabb (`largestSide` = grootste aabb-zijde); daarna per onderdeel `plateSize(...)`. Rij = categorie; "Zonder fase" als laatste rij. Knop: `button.left-tb-btn#catalogus-toggle`, `title="Catalogus"`, stapel-icoon (inline SVG 20×20).
- Openen: `manager?.showStart()`, veld tonen, labels `<plaatsoort> · <rest>/<totaal>` (Zonder fase: `Zonder fase · n/n`), camera `instance.camera.setCameraView(gebouwBox.union(veld.bounds), true)`, abonneren op `manager.onChange` → `setOnField` + labels bijwerken. Zonder `manager` of zonder fases: stand blijft `start`, alles op het veld.
- Sluiten: abonnement opheffen, `field.hide()`, en als `manager?.state.kind === "start"` → `manager.reset()`.
- `main.ts`: `initBouwvolgorde` returnt niet meer vroeg bij nul fases; speler, tijdlijn en filter alleen als `phases.length > 0`, de catalogus altijd (`manager` dan `null`). Knop onder de filterknop in `leftToolbar`. `window.__catalogus = handle`.

- [ ] **Step 1: Breid de browsertest uit** — na `Start state passed.`:

```js
const fieldInScene = () => page.evaluate(() => Boolean(window.__instance.viewer.getRenderer().scene.getObjectByName('catalogus-veld')));
await page.getByTitle('Catalogus', { exact: true }).click();
assert.equal(await page.evaluate(() => window.__catalogus.visiblePlateCount()), 390);
assert.equal(await page.locator('.bv-label').textContent(), 'Start — nog niets gebouwd');
assert.equal(await page.locator('.cat-label').count(), 19);
await page.getByTitle('Volgende fase').click();
assert.equal(await page.evaluate(() => window.__catalogus.visiblePlateCount()), 389);
await setPhase(385);
assert.equal(await page.evaluate(() => window.__catalogus.visiblePlateCount()), 2);
await page.getByTitle('Volgende fase').click();          // al op de laatste fase: blijft 2
await page.evaluate(() => window.__bouwvolgorde.showStart());
await page.getByTitle('Catalogus', { exact: true }).click(); // sluiten in startstand
assert.equal(await page.evaluate(() => window.__bouwvolgorde.state.kind), 'complete');
assert.equal((await filtering())?.hiddenObjects?.length ?? 0, 0);
for (let i = 0; i < 3; i++) {
  await page.getByTitle('Catalogus', { exact: true }).click();
  await page.getByTitle('Catalogus', { exact: true }).click();
}
assert.equal(await fieldInScene(), false);
assert.equal(await page.locator('.cat-label').count(), 0);
console.log('Stock field passed.');
```

- [ ] **Step 2:** Browsertest → FAIL (geen Catalogus-knop).
- [ ] **Step 3:** Installeer de dependencies en implementeer `stock-field.ts`, `catalogus.ts`, `index.ts`, de wijziging in `main.ts` en `.cat-label` in `style.css` (klein label, achtergrond `var(--bg-toolbar)`, tekst `var(--text-primary)`, `pointer-events: none`, `font-size: 11px`, `white-space: nowrap`, `transform: translate(-50%, -100%)`).
- [ ] **Step 4:** Browsertest, `npm test` en `npm run build` → PASS. Handmatig op `http://localhost:3052/demo/pr1`: veld ligt naast de lange zijde, platen liggen plat, labels zijn leesbaar in licht en donker thema.
- [ ] **Step 5: Commit** — `feat(catalogus): 3D-opslagveld dat meeloopt met de bouwvolgorde`

---

### Task 5: Catalogus-paneel en klik-markering

**Files:**
- Create: `src/addons/catalogus/catalog-panel.ts`
- Modify: `src/addons/catalogus/catalogus.ts`
- Modify: `src/style.css`
- Modify: `CLAUDE.md` (featuretabel + projectstructuur: `src/addons/catalogus/`)
- Test: `tests/construction-sequence.browser.mjs`

**Interfaces:**
- Consumes: `Catalog`, `stockCount`, `BuildState` (Task 1); `StockField.setSelected/onStackClick` (Task 4).
- Produces:
  ```ts
  export interface CatalogPanel {
    element: HTMLElement;                                   // #catalogus-panel
    update(catalog: Catalog, state: BuildState): void;
    setSelected(stackKey: string | null): void;
    onRowClick(listener: (stackKey: string) => void): void;
    onClose(listener: () => void): void;
  }
  export function createCatalogPanel(): CatalogPanel;
  ```

Opbouw paneel (hergebruik bestaande klassen `mp-header`, `mp-title`, `mp-close`):
- `.cat-summary`: `Nog op het veld: <rest> van <totaal> · <m³> m³` (m³ met één decimaal, nl-NL).
- Per groep (`catalog.groups`, daarna `unphased` als groep `Zonder fase`): `<details class="cat-group" open>` met `<summary>` `<categorie> (<aantal>)`.
- Per stapel `.cat-row[data-stack="<key>"]`: `.cat-type` (plaatsoort; bij Zonder fase de tekst `Alle soorten`), `.cat-bar > .cat-bar-fill` (breedte = rest/totaal), `.cat-count` `<rest> / <totaal>`, `.cat-volume` `<m³> m³`. Geselecteerde rij krijgt klasse `selected`.

Klik-markering (in `catalogus.ts`):
- Klik op rij of stapel → selectie wisselen. Bij selectie: `filtering.setUserObjectColors([...oranje groep van de huidige fase (#f5a623, alleen als state.kind === "phase"), { objectIds: <ids van de stapel>, color: "#3b82f6" }])`, daarna `applyCltOverlay(instance)` en `requestRender()`. Bij deselectie: alleen de oranje groep, of `removeUserObjectColors()` als die er niet is.
- Bij elke `onChange` van de manager: selectie op `null` (paneel, veld) — PhaseManager zet de kleuren zelf opnieuw.
- Het paneel opent en sluit met de Catalogus-knop; `mp-close` sluit de hele catalogus (zelfde pad als de knop).

CSS: `#catalogus-panel` rechts zoals `#filter-panel` (zelfde breedte, achtergrond, schaduw, scroll); `.hidden` verbergt. Onder `@media (max-width: 768px)`: onderaan, volle breedte, `max-height: 45vh`, met de tijdlijn erboven zichtbaar (`bottom` gelijk aan de hoogte van `#bouwvolgorde-timeline` + 8px).

- [ ] **Step 1: Breid de browsertest uit** — na `Stock field passed.`:

```js
await page.getByTitle('Catalogus', { exact: true }).click();
assert.equal(await page.locator('.cat-summary').textContent(), 'Nog op het veld: 390 van 390 · 148,0 m³');
assert.deepEqual(await page.locator('.cat-group > summary').allTextContents(),
  ['Wanden (200)', 'Vloeren (59)', 'Dak (28)', 'Stelkozijnen (101)', 'Zonder fase (2)']);
assert.equal(await page.locator('.cat-row').count(), 19);
await page.getByTitle('Volgende fase').click();
assert.match(await page.locator('.cat-summary').textContent(), /^Nog op het veld: 389 van 390 · /);
const row = page.locator('.cat-row[data-stack="Wanden|100-03s-1-TT"]');
assert.equal(await row.locator('.cat-count').textContent(), '13 / 14');
const blue = async () => ((await filtering())?.userColorGroups ?? []).find(g => g.color === '#3b82f6');
await row.click();
assert.equal((await blue())?.ids.length, 14);
assert.ok(await row.evaluate(el => el.classList.contains('selected')));
await page.getByTitle('Volgende fase').click();
assert.equal(await blue(), undefined);
// slepen over een stapel selecteert niet, klikken wel
const pos = await page.evaluate(() => window.__catalogus.screenPosition('Wanden|100-03s-1-TT'));
await page.mouse.move(pos.x, pos.y + 12); await page.mouse.down();
await page.mouse.move(pos.x + 40, pos.y + 12, { steps: 5 }); await page.mouse.up();
assert.equal(await blue(), undefined);
const after = await page.evaluate(() => window.__catalogus.screenPosition('Wanden|100-03s-1-TT')); // slepen draaide de camera
await page.mouse.click(after.x, after.y + 12);
assert.ok(await blue());
await page.getByTitle('Catalogus', { exact: true }).click();
console.log('Catalog panel passed.');
```

(`screenPosition` geeft het label-ankerpunt; 12 px lager valt op de bovenste plaat van de stapel. Komt de klik in de praktijk naast de stapel uit, gebruik dan het midden van de bovenste plaat in `screenPosition` en documenteer dat in de interface.)

- [ ] **Step 2:** Browsertest → FAIL (geen `.cat-summary`).
- [ ] **Step 3:** Implementeer `catalog-panel.ts`, de koppeling en klik-markering in `catalogus.ts`, de CSS, en werk `CLAUDE.md` bij.
- [ ] **Step 4:** Browsertest, `npm test`, `npm run build` → PASS. Handmatig: op 375 px breed (telefoon) paneel onderaan, tijdlijn nog bedienbaar; op tablet (768 px) paneel rechts.
- [ ] **Step 5: Commit** — `feat(catalogus): paneel met voorraad per plaatsoort en markering in het gebouw`
