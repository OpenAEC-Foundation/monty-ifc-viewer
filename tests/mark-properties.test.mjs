import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/addons/bouwvolgorde/mark-properties.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { isSequenceElement, readSequenceProperties } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);
const ifc = groups => ({
  speckle_type: 'Objects.Data.DataObject',
  ifcType: 'IfcWall',
  properties: { 'Property Sets': groups },
});
const revit = groups => ({
  speckle_type: 'Objects.Data.RevitObject',
  category: 'Parts',
  properties: { Parameters: { 'Instance Parameters': groups } },
});

test('recognizes IFC elements without a top-level Revit category', () => {
  assert.equal(isSequenceElement(ifc({})), true);
  assert.equal(isSequenceElement(revit({})), true);
  assert.equal(isSequenceElement({ speckle_type: 'Objects.Geometry.Mesh' }), false);
  assert.equal(isSequenceElement({ speckle_type: 'Objects.Data.DataObject' }), false);
});

test('reads IFC Marks and Original Type from exported property sets', () => {
  assert.deepEqual(readSequenceProperties(ifc({
    'Identity Data': { Mark: '714', 'Original Type': '080-03s-1-TL' },
  })), { mark: '714', originalType: '080-03s-1-TL', fromCltTag: false });
});

test('keeps support for direct Revit connector parameter values', () => {
  assert.deepEqual(readSequenceProperties(revit({
    'Identity Data': { Mark: { value: 101 }, 'Original Type': { value: 'CLT 100' } },
  })), { mark: '101', originalType: 'CLT 100', fromCltTag: false });
});

test('CLT tag Marks take precedence over generic tag identifiers in both formats', () => {
  for (const wrap of [ifc, revit]) {
    assert.deepEqual(readSequenceProperties(wrap({
      Text: { CLT_T_Mark: { value: '314' } },
      'Identity Data': { Mark: '999', 'Type Name': 'CLT tag' },
    })), { mark: '314', originalType: 'CLT tag', fromCltTag: true });
  }
});

test('detects IFC tag families even when their Mark is stored under Identity Data', () => {
  assert.deepEqual(readSequenceProperties(ifc({
    Other: { Category: 'Generic Models', Family: '00_CLT TAG' },
    'Identity Data': { Mark: '138' },
  })), { mark: '138', originalType: null, fromCltTag: true });
});

test('zero and empty tags do not become phases and do not mask an element Mark', () => {
  for (const value of [undefined, null, '', 0, '0', { value: null }, { value: '' }, { value: '0' }]) {
    assert.equal(readSequenceProperties(ifc({ 'Identity Data': { Mark: value } })).mark, null);
    assert.equal(readSequenceProperties(ifc({ Text: { CLT_T_Mark: value }, 'Identity Data': { Mark: '4' } })).mark, '4');
  }
});

test('elements without optional sequence metadata remain unmarked', () => {
  assert.deepEqual(readSequenceProperties(ifc({ Other: { Category: 'Levels' } })), {
    mark: null, originalType: null, fromCltTag: false,
  });
});
