import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const platform = fileURLToPath(new URL('..', import.meta.url));

// Exercise the real production entry, including shared/site/SwipePrompt outside
// this package. The repository root intentionally uses React 18; Family uses 19.
test('Family and its shared confirmation UI bundle one React runtime', async () => {
  const modules = new Set();
  await build({
    configFile: path.join(platform, 'vite.family.config.ts'),
    logLevel: 'error',
    build: { write: false },
    plugins: [{
      name: 'inspect-family-react-runtime',
      generateBundle() {
        for (const id of this.getModuleIds()) modules.add(id.replaceAll('\\', '/'));
      },
    }],
  });
  assert.ok([...modules].some(id => id.endsWith('/shared/site/SwipePrompt.tsx')),
    'The regression must exercise the shared component shown after joining');
  for (const pkg of ['react', 'react-dom']) {
    const roots = new Set([...modules].flatMap(id => {
      const marker = `/node_modules/${pkg}/`;
      const index = id.indexOf(marker);
      return index < 0 ? [] : [id.slice(0, index + marker.length - 1).replace(/^\0/, '')];
    }));
    assert.deepEqual([...roots], [path.join(platform, 'node_modules', pkg)],
      `${pkg} must resolve to the platform package, including shared components`);
  }
});
