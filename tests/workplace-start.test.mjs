import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/core/host.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const { startProject } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const speckle = (initialProject) => ({ projects: async () => ({}), model: async () => ({}), preview: async () => null, initialProject });

test('without a link and without an intent the workplace shows the overview', () => {
  assert.equal(startProject(null, speckle(undefined)), null);
  assert.equal(startProject(null, speckle('')), null);
});

test('a link to one project opens it on the first start', () => {
  assert.equal(startProject(null, speckle('0595b906e7')), '0595b906e7');
});

test('after a reload the intent decides, also over the link', () => {
  assert.equal(startProject({ project: '5d40981f21' }, speckle('0595b906e7')), '5d40981f21');
  assert.equal(startProject({ overview: true }, speckle('0595b906e7')), null);
  assert.equal(startProject({ file: 'b-1' }, speckle('0595b906e7')), null);
});

test('without Speckle in the host there is no project to open', () => {
  assert.equal(startProject({ project: '5d40981f21' }, undefined), null);
});
