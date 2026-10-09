import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BUILDS_DATA } from '../src/data/builds.js';
import { MODELS_DATA } from '../src/data/models.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('Speed figures are stored once', () => {
  it("every build sheet's speed is its model's typicalSpeedDual3090", () => {
    for (const m of MODELS_DATA) {
      const sheet = BUILDS_DATA[m.id];
      if (sheet) assert.equal(sheet.speedTarget, m.typicalSpeedDual3090, m.id);
    }
  });

  it('builds.js has no hand-typed speed of its own', () => {
    const src = fs.readFileSync(path.join(ROOT_DIR, 'src', 'data', 'builds.js'), 'utf-8');
    assert.deepEqual(src.match(/speedTarget:\s*['"`]/g) || [], [], 'speedTarget must come from the model data');
  });

  it('keeps the figures chosen for the three models that used to disagree', () => {
    const speed = (id) => MODELS_DATA.find(m => m.id === id).typicalSpeedDual3090;
    assert.match(speed('llama-3.3-70b'), /^17 - 21 tokens\/sec/);
    assert.match(speed('mistral-nemo-12b'), /^50 - 85 tokens\/sec/);
    assert.match(speed('llama-3.1-8b'), /^90 - 130 tokens\/sec/);
  });
});
