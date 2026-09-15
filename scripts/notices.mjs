import { readFile, writeFile } from 'node:fs/promises';
const packages = ["astro"];
const source = {astro:'https://github.com/withastro/astro',arktype:'https://github.com/arktypeio/arktype','@ark/util':'https://github.com/arktypeio/arktype','@ark/schema':'https://github.com/arktypeio/arktype',arkregex:'https://github.com/arktypeio/arktype'};
const disclosures=[];const notices=['Third-party software notices\n'];
for(const name of packages){const metadata=JSON.parse(await readFile(`node_modules/${name}/package.json`,'utf8'));const license=await readFile(`node_modules/${name}/LICENSE`,'utf8');disclosures.push({name,version:metadata.version,license:metadata.license,source:source[name]});notices.push(`${name} ${metadata.version} — ${metadata.license}\nSource: ${source[name]}\n\n${license}`)}

await writeFile('public/notices.txt',notices.join('\n\n────────────────────────────────────────\n\n')+'\n');
await writeFile('src/lib/package-disclosures.json',JSON.stringify(disclosures,null,2)+'\n');
