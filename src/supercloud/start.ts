/**
 * Start in the SuperCloud workplace: language and theme of the host, the file the workplace was opened with, and the
 * tools for the assistant. The viewer only reads, so no tool needs `bevestigen`.
 */
import * as ifcStore from '@/state/ifc-store';
import { setTheme } from '@/state/theme-store';
import { changeLocale, type Locale } from '@/state/locale-store';
import { translations } from '@/i18n/translations';
import { loadFromHost } from '@/actions/load-file';
import { selectParameter } from '@/actions/select-parameter';
import { naturalSort } from '@/utils/value-sorter';
import { getSiteHost, installWorkplaceApp, isIfc, type SiteHost, type WorkplaceTool } from './siteHost';

function applyPreferences(host: { taal?: string; thema?: string }): void {
  const language = (host.taal ?? '').split('-')[0];
  if (language in translations) changeLocale(language as Locale);
  else if (language) changeLocale('en');
  if (host.thema === 'light' || host.thema === 'dark') setTheme(host.thema);
}

function parameterSummary(path: string) {
  const info = ifcStore.allParameters.get(path);
  if (!info) return null;
  let objects = 0;
  for (const ids of info.objectIds.values()) objects += ids.length;
  return { parameter: path, values: info.values.size, objects };
}

const NO_MODEL = 'Er is nog geen model geopend.';

export function workplaceTools(host: SiteHost): WorkplaceTool[] {
  const requireModel = () => {
    if (!ifcStore.hasFile()) throw new Error(NO_MODEL);
  };
  return [
    {
      name: 'monty_list_models',
      description: 'De IFC-bestanden in de Docs-map van de viewer (id en naam).',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: async () => (await host.list()).filter((file) => isIfc(file.name)),
    },
    {
      name: 'monty_open_model',
      description: 'Open een IFC-bestand uit Docs in de viewer (alleen lezen; het bestand verandert niet).',
      inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } }, additionalProperties: false },
      run: async (args) => {
        await loadFromHost(host, String(args.id));
        return { fileName: ifcStore.fileName(), elements: ifcStore.elements.length };
      },
    },
    {
      name: 'monty_model_info',
      description: 'Het geopende model: bestandsnaam, aantal elementen, aantal parameters en de gekozen parameter voor de bouwvolgorde.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: () => ({
        fileName: ifcStore.fileName() || null,
        elements: ifcStore.elements.length,
        parameters: ifcStore.allParameters.size,
        selectedParameter: ifcStore.selectedParameter() || null,
      }),
    },
    {
      name: 'monty_list_parameters',
      description: 'De parameters van het model met het aantal verschillende waarden en het aantal objecten.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: () => {
        requireModel();
        return ifcStore.parameterOptions().map(([path]) => parameterSummary(path));
      },
    },
    {
      name: 'monty_select_parameter',
      description: 'Kies de parameter waarop de bouwvolgorde loopt (zoals Mark). Verandert alleen de weergave.',
      inputSchema: { type: 'object', required: ['parameter'], properties: { parameter: { type: 'string' } }, additionalProperties: false },
      run: (args) => {
        requireModel();
        const path = String(args.parameter);
        if (!ifcStore.allParameters.has(path)) throw new Error(`Onbekende parameter: ${path}`);
        ifcStore.setSelectedParameter(path);
        selectParameter(path);
        return parameterSummary(path);
      },
    },
    {
      name: 'monty_list_values',
      description: 'De waarden van de gekozen parameter in volgorde van de bouwvolgorde, met het aantal objecten per waarde.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      run: () => {
        requireModel();
        const info = ifcStore.allParameters.get(ifcStore.selectedParameter());
        if (!info) return [];
        return Array.from(info.values).sort(naturalSort).map((value) => ({ value, objects: info.objectIds.get(value)?.length ?? 0 }));
      },
    },
  ];
}

export function startSupercloud(): boolean {
  const host = getSiteHost();
  if (!host) return false;
  applyPreferences(host);
  window.addEventListener('openaec-host-preferences', () => applyPreferences(host));
  installWorkplaceApp(workplaceTools(host));
  if (host.initialFileId) void loadFromHost(host, host.initialFileId);
  return true;
}
