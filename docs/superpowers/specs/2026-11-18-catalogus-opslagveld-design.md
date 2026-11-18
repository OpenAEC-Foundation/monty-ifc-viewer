# Ontwerp: Catalogus met 3D-opslagveld

**Datum:** 2026-11-18
**Branch:** `feat/catalogus-opslagveld`
**Status:** Gevalideerd ontwerp — klaar voor implementatieplan

## Doel

Een knop **Catalogus** in de viewer die laat zien wat er nodig is om het gebouw
te bouwen, ingedeeld per categorie en plaatsoort. Naast het gebouw ligt een
3D-opslagveld met de onderdelen als gestapelde platen. Hoe verder de
bouwvolgorde loopt, hoe leger het veld: wat in het gebouw zit, ligt niet meer
op het veld.

## Uitgangspunten

- **Bron:** alleen wat in het model zit. Schroeven, verbinders en ander klein
  materiaal staan niet in het model en vallen buiten deze versie.
- **Speckle-viewer blijft ongewijzigd.** Het veld gebruikt alleen publieke API:
  `viewer.getRenderer().scene` voor eigen three.js-objecten en
  `getWorldTree().getRenderTree().getRenderViewsForNodeId()` voor bounding boxes.
- **Tablet/mobiel** moet werken (harde eis van het project).

## Referentiedata (voorbeeldproject `5e0fe816a2`)

- 390 onderdelen, materiaal CLT. 388 met Mark, 2 wanden zonder Mark.
- Categorieën ("Original Category"): 202 Walls, 59 Floors, 28 Roofs,
  101 Generic Models (familie "Stelkozijn" en "Stelkozijn 2").
- 19 plaatsoorten ("Original Type"), bijv. `100-05s-1-TT` (93 stuks, 36,4 m³).
  De eerste drie cijfers van de code zijn de plaatdikte in mm.
- Per onderdeel in `Property Sets`: `Identity Data` (Mark, Original Type,
  Original Category, Original Family) en `Dimensions` (Length, Height,
  Thickness in mm; Area; Volume in m³). Dak en stelkozijnen hebben alleen Volume.

## 1. Knop en paneel

- Knop **Catalogus** in de linker knoppenbalk, onder bouwvolgorde en filter.
- Paneel rechts (desktop/tablet), uitschuifpaneel van onderen (telefoon).
- Kop: samenvatting, bijv. "Nog op het veld: 274 van 390 · 120,4 m³".
- Per categorie inklapbaar; per regel: plaatsoort, balkje voorraad/totaal,
  aantal (`12 / 93`), m³.
- Categorienamen: Walls → Wanden, Floors → Vloeren, Roofs → Dak. Generic Models
  → de familienaam zonder volgnummer, in meervoud (Stelkozijn → Stelkozijnen).
  Onbekende categorie → Overig.
- Onderdelen zonder plaatsoort komen onder hun categorie als "Onbekende soort".
- CLT-tags (`mapping.cltTagIds`) zijn geen bouwdelen en tellen niet mee.
- Stijl: huidige viewer-stijl (CSS-variabelen in `style.css`). De OpenAEC-stijl
  komt met het aparte herontwerp.

## 2. Opslagveld in 3D

- Ligt op maaiveldhoogte (laagste punt van het gebouw), naast de lange zijde
  van het gebouw, met een tussenruimte van 3 m.
- Indeling: een rij per categorie; binnen de rij één stapel per plaatsoort.
  Stapels en rijen overlappen nooit.
- Elke plaat ligt plat, houtkleur, met eigen maten:
  - dikte: `Dimensions.Thickness`, anders de drie cijfers van de plaatsoort,
    anders de kleinste zijde van de bounding box;
  - lengte × breedte: `Dimensions.Length` × `Dimensions.Height` als die er
    zijn; anders de twee grootste zijden van de bounding box, geschaald zodat
    oppervlak × dikte gelijk is aan het Volume. Dit is een benadering.
- Eenheden: property-maten (mm) worden omgerekend naar de eenheid van de scène.
- Label per stapel (HTML-overlay, meebewegend met de camera):
  `100-05s-1-TT · 12/93`.
- Bij openen kadert de camera gebouw + veld samen in.
- Doorsnede en explode werken niet op het veld (het is geen Speckle-geometrie).
- Sluiten van de catalogus verwijdert veld en labels uit de scène.

## 3. Koppeling met de bouwvolgorde

- Bij openen springt de bouwvolgorde naar een nieuwe **startstand**: nog niets
  gebouwd, het hele gebouw geghost, alles op het veld.
- Bij elke fase verdwijnen de platen van die fase van hun stapel; in het
  gebouw kleuren ze oranje zoals nu. Terugspoelen legt ze terug.
- De voorraad hangt af van de stand van de bouwvolgorde, niet alleen van de
  index (de reset gebruikt nu ook index `-1`):
  - **startstand** (nieuw): niets gebouwd → alle onderdelen op het veld;
  - **fase `i`**: op het veld liggen de onderdelen met fase-index groter dan `i`;
  - **reset** (tijdlijn inactief, gebouw compleet): alles gebouwd → veld leeg,
    alleen "Zonder fase" blijft liggen.
- Onderdelen zonder Mark: eigen stapel **"Zonder fase"**; blijft liggen.
- Model zonder fases: vaste lijst met vol veld, geen tijdlijnkoppeling.
- `PhaseManager` krijgt een abonnement op fasewijzigingen en de startstand.

## 4. Klikken

- Klik op een stapel (eigen raycast op de veldobjecten) of op een paneelregel:
  alle onderdelen van die plaatsoort in die categorie lichten blauw op in het
  gebouw. Nogmaals klikken zet het uit.
- Een fasewijziging heft de blauwe markering op.

## Opbouw

```
src/addons/catalogus/
  catalog-data.ts   # puur: categorie, plaatsoort, maten, voorraad per fase
  field-layout.ts   # puur: posities van platen en stapels op het veld
  stock-field.ts    # three.js: platen, labels, raycast
  catalog-panel.ts  # DOM: knop + paneel
  index.ts
```

- `phase-manager.ts`: `onChange(listener)` en `showStart()`.
- `package.json`: `three` 0.140.2 als expliciete dependency (zelfde versie als
  de viewer).

## Foutafhandeling

- Geen onderdelen gevonden → knop verschijnt niet.
- Ontbrekende maten → terugval zoals hierboven; zonder bounding box een plaat
  van 1 × 1 m met de dikte uit de plaatsoort.

## Verificatie

- `npm test`: unittests voor catalog-data en field-layout (indeling,
  dikte uit plaatsoort, voorraad na fase X, geen overlap van stapels).
- Browsertest uitbreiden: catalogus openen, één fase verder, voorraad daalt.
- `npm run build` (strict TypeScript + Vite) slaagt.
- Handmatig op localhost: voorbeeldproject, op tablet-breedte.

## Buiten scope

- Schroeven, verbinders en ander klein materiaal (later: aparte lijst of regels).
- OpenAEC-stijl (apart herontwerp).
- Export van de catalogus (CSV/PDF).
