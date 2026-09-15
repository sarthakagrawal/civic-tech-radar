import {createHash} from 'node:crypto';
import {Input,Signal,Radar} from '../src/lib/contracts.js';
export const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
export const identifier=(kind:string,value:string)=>`${kind}-${sha(value.normalize('NFKC').trim().toLowerCase()).slice(0,20)}`;
export function transform(raw:unknown){
 const input=Input.assert(raw);
 const seen=new Set<number>();
 const signals=input.rows.map(row=>{if(seen.has(row.row))throw new Error(`Duplicate workbook row ${row.row}`);seen.add(row.row);
 return Signal.assert({...row,id:identifier('signal',JSON.stringify([row.link,row.date,row.stage,row.title])),sourceId:identifier('source',row.source),actorId:identifier('actor',row.actor||'Unknown')});}).sort((a,b)=>(b.date??'').localeCompare(a.date??'')||a.id.localeCompare(b.id));
 if(new Set(signals.map(s=>s.id)).size!==signals.length)throw new Error('Duplicate historical observation; reconcile explicitly');
 const sourceNames=[...new Set([...input.sources.map(s=>s.name),...signals.map(s=>s.source)])].sort();
 const sources=sourceNames.map(name=>{const row=input.sources.find(s=>s.name===name);return {id:identifier('source',name),name,url:row?.url??null,sourceType:row?.sourceType??signals.find(s=>s.source===name)?.sourceType??'',count:signals.filter(s=>s.source===name).length};});
 const actors=[...new Set(signals.map(s=>s.actor||'Unknown'))].sort().map(name=>({id:identifier('actor',name),name,count:signals.filter(s=>(s.actor||'Unknown')===name).length}));
 const dates=[...new Set(signals.map(s=>s.date))].sort((a,b)=>(a??'').localeCompare(b??''));
 const history=dates.map(date=>({date,added:signals.filter(s=>s.date===date).map(s=>s.id).sort(),total:signals.filter(s=>(s.date??'')<=(date??'')).length}));
 return Radar.assert({schemaVersion:1,asOf:dates.at(-1)??null,signals,sources,actors,history,provenance:{workbookSha256:input.workbookSha256,legacySnapshotSha256:input.legacySnapshotSha256,legacyCount:input.legacyCount,importedRows:signals.length,additionalRows:signals.length-input.legacyCount,sourceRevision:'dc289a3f1e726d2e1952faa1792c42f9bd67348b',derivationVersion:'historical-v1',repairs:[{rows:[122,123,124],field:'link',fromColumn:'J',reason:'Historical rows omit tags; URL is in J and K contains confidence.'}],excludedFields:['summary','why_it_matters','confidence','article_one_relevance','tags','notes','what_to_pull','RunLog','digests','discovery candidates']}});
}
export function csv(rows:Record<string,unknown>[]){if(!rows.length)return '';const keys=Object.keys(rows[0]!);return [keys,...rows.map(r=>keys.map(k=>r[k]??''))].map(r=>r.map(x=>'"'+String(x).replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';}
