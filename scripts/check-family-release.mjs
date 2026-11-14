import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const directory = new URL('../public/family-experience/', import.meta.url);
const html = await readFile(new URL('family-wall.html', directory), 'utf8');
const assetPrefix = '/family-experience/';
const script = html.match(/<script\b[^>]*src="([^"]+[.]js)"/)?.[1];
const style = html.match(/<link\b[^>]*href="([^"]+[.]css)"/)?.[1];
assert.ok(script?.startsWith(assetPrefix + 'assets/'), 'Family must load JavaScript from the website build');
assert.ok(style?.startsWith(assetPrefix + 'assets/'), 'Family must load CSS from the website build');

const [js, css] = await Promise.all(
  [script, style].map(asset => readFile(new URL(asset.slice(assetPrefix.length), directory), 'utf8')),
);
assert.ok(js.includes('See the family'), 'Family build is missing the wall invitation');
assert.ok(js.includes('marketingConsentVersion'), 'Family build is missing versioned signup consent');
assert.ok(css.includes('family-wall-invite'), 'Family build is missing the invitation pulse');
assert.match(css, /\.brick-title-choice:hover[^{}]*\{[^{}]*fill:var\(--family-accent\)/,
  'Family build is missing the gold title hover');
console.log('Verified the Family entry, wall invitation, title hover and versioned consent.');
