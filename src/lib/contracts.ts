import { type } from 'arktype';
export const HttpUrl = type('string').narrow((v,ctx)=> {try { const u=new URL(v); return (u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password||ctx.mustBe('a public HTTP(S) URL'); }catch{return ctx.mustBe('a public HTTP(S) URL');}});
export const IsoDate = type('string').narrow((v,ctx)=> /^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v||ctx.mustBe('an ISO calendar date'));
export const HistoricalRow = type({row:'number.integer >= 2',title:'string > 0',source:'string > 0',actor:'string',sourceType:'string',stage:'string',date:IsoDate,link:HttpUrl,'+':'reject'});
export const SourceRow = type({name:'string > 0',url:HttpUrl.or('null'),sourceType:'string','+':'reject'});
export const Input = type({schemaVersion:'1',workbookSha256:'string',legacySnapshotSha256:'string',legacyCount:'number.integer >= 0',rows:HistoricalRow.array(),sources:SourceRow.array(),'+':'reject'});
export const Signal = type({id:'string',title:'string',source:'string',actor:'string',sourceType:'string',stage:'string',date:IsoDate,link:HttpUrl,sourceId:'string',actorId:'string',row:'number.integer >= 2','+':'reject'});
export type RadarSignal = typeof Signal.infer;
