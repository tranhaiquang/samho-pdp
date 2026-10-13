/**
 * Minify the shipped seed dataset in place.
 *
 * public/seed-policy-data.json is the default dataset every new visitor gets,
 * and it is downloaded on first load. As pretty-printed JSON it carries roughly
 * 50 KB of pure whitespace and indentation.
 *
 * JSON.parse/stringify round-trips key order and number precision exactly, so
 * this is lossless with respect to the data itself.
 *
 * Usage:  node scripts/minify-seed.mjs [sourceJson] [destJson]
 *   source defaults to public/seed-policy-data.json (minified in place)
 */
import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.argv[2] ?? 'public/seed-policy-data.json');

if (!fs.existsSync(target)) {
  console.error(`[minify-seed] Not found: ${target}`);
  process.exit(1);
}

const source = fs.readFileSync(target, 'utf8');
const minified = JSON.stringify(JSON.parse(source));

if (minified === source) {
  console.log(`[minify-seed] Already minified (${target})`);
} else {
  fs.writeFileSync(target, minified, 'utf8');
  const saved = ((source.length - minified.length) / 1024).toFixed(1);
  console.log(
    `[minify-seed] ${path.basename(target)}: ${(source.length / 1024).toFixed(1)} KB -> ` +
      `${(minified.length / 1024).toFixed(1)} KB (saved ${saved} KB)`
  );
}