import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMPONENTS_DIR = path.join(ROOT_DIR, 'src', 'components');
const components = fs.readdirSync(COMPONENTS_DIR).filter(f => f.endsWith('.js'))
  .map(f => ({ file: f, src: fs.readFileSync(path.join(COMPONENTS_DIR, f), 'utf-8') }));

describe('Visual system', () => {
  it('components style through classes in style.css, not inline style attributes', () => {
    for (const { file, src } of components) {
      const hits = src.match(/style="[^"]*"/g) || [];
      assert.deepEqual(hits, [], `${file} has inline styles`);
    }
  });
});
