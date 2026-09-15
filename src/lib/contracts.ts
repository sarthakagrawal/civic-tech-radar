import { type } from 'arktype';
export const HttpUrl = type('string').narrow((v,ctx)=> {try { const u=new URL(v); return (u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password||ctx.mustBe('a public HTTP(S) URL'); }catch{return ctx.mustBe('a public HTTP(S) URL');}});
export const IsoDate = type('string').narrow((v,ctx)=> /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v||ctx.mustBe('an ISO calendar date'));
export const HistoricalRow = type({row:'number.integer >= 2',title:'string > 0',source:'string > 0',actor:'string',sourceType:'string',stage:'string',date:IsoDate.or('null'),link:HttpUrl,'+':'reject'});
export const SourceRow = type({name:'string > 0',url:HttpUrl.or('null'),sourceType:'string','+':'reject'});
export const Input = type({schemaVersion:'1',workbookSha256:'string',legacySnapshotSha256:'string',legacyCount:'number.integer >= 0',rows:HistoricalRow.array(),sources:SourceRow.array(),'+':'reject'});
export const Signal = type({id:'string',title:'string',source:'string',actor:'string',sourceType:'string',stage:'string',date:IsoDate.or('null'),link:HttpUrl,sourceId:'string',actorId:'string',row:'number.integer >= 2','+':'reject'});
export type RadarSignal = typeof Signal.infer;

export const PublicSource = type({id:'string',name:'string > 0',url:HttpUrl.or('null'),sourceType:'string',count:'number.integer >= 0','+':'reject'});
export const PublicActor = type({id:'string',name:'string > 0',count:'number.integer >= 0','+':'reject'});
export const HistoryEntry = type({date:IsoDate.or('null'),added:'string[]',total:'number.integer >= 0','+':'reject'});
export const Provenance = type({workbookSha256:'/^[0-9a-f]{64}$/',legacySnapshotSha256:'/^[0-9a-f]{64}$/',legacyCount:'number.integer >= 0',importedRows:'number.integer >= 0',additionalRows:'number.integer >= 0',sourceRevision:'/^[0-9a-f]{40}$/',derivationVersion:'string',repairs:type({rows:'number[]',field:'string',fromColumn:'string',reason:'string','+':'reject'}).array(),excludedFields:'string[]','+':'reject'});
export const Radar = type({schemaVersion:'1',asOf:IsoDate.or('null'),signals:Signal.array(),sources:PublicSource.array(),actors:PublicActor.array(),history:HistoryEntry.array(),provenance:Provenance,'+':'reject'}).narrow((value,ctx)=>{
 const unique=(items:{id:string}[])=>new Set(items.map(x=>x.id)).size===items.length;
 if(!unique(value.signals)||!unique(value.sources)||!unique(value.actors))return ctx.mustBe('unique entity identifiers');
 if(value.signals.some(s=>!value.sources.some(x=>x.id===s.sourceId)||!value.actors.some(x=>x.id===s.actorId)))return ctx.mustBe('valid entity references');
 if(value.sources.some(x=>x.count!==value.signals.filter(s=>s.sourceId===x.id).length)||value.actors.some(x=>x.count!==value.signals.filter(s=>s.actorId===x.id).length))return ctx.mustBe('accurate entity counts');
 if(value.provenance.importedRows!==value.signals.length)return ctx.mustBe('accurate imported count');
 const ids=value.history.flatMap(h=>h.added);if(ids.length!==value.signals.length||new Set(ids).size!==ids.length||ids.some(id=>!value.signals.some(s=>s.id===id)))return ctx.mustBe('complete unique history references');
 let cumulative=0;for(const h of value.history){cumulative+=h.added.length;if(h.total!==cumulative||h.added.some(id=>value.signals.find(s=>s.id===id)?.date!==h.date))return ctx.mustBe('accurate dated history');}
 if(value.asOf!==value.signals.map(s=>s.date).filter((d):d is string=>d!==null).sort().at(-1)&&!(value.asOf===null&&value.signals.every(s=>s.date===null)))return ctx.mustBe('accurate latest date');
 return true;
});
