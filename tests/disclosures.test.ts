import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('visible disclosures match exact installed versions and full license notices',()=>{
 const packages=JSON.parse(readFileSync('src/lib/package-disclosures.json','utf8'));
 const notices=readFileSync('public/notices.txt','utf8');
 const layout=readFileSync('src/layouts/Layout.astro','utf8');
 assert.match(layout,/Full software notices/);
 for(const entry of packages){
  const metadata=JSON.parse(readFileSync(`node_modules/${entry.name}/package.json`,'utf8'));
  assert.equal(entry.version,metadata.version);assert.equal(entry.license,metadata.license);
  assert.ok(notices.includes(readFileSync(`node_modules/${entry.name}/LICENSE`,'utf8')));
  assert.ok(notices.includes(entry.source));
 }
});
