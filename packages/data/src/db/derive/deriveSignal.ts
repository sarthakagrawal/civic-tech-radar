import {eq} from 'drizzle-orm';
import {type} from 'arktype';
import type {PgliteDatabase} from 'drizzle-orm/pglite';
import * as schema from '../schema/index.js';
import {canonicalizeUrl,sha256Hex,stableSignalId,stableSourceId} from './normalize.js';
import {RawIngestionEventSelect,SignalInsert,SignalObservationInsert,SourceInsert} from '../validators.js';
import {HttpUrl,IsoDate} from '../../../../../src/lib/contracts.js';
export const DERIVATION_VERSION='deterministic-v4';
export const DeriveInput=type({rawEventId:'string',source:{name:'string > 0',url:HttpUrl,'sourceTypeSlug?':'string'},'actor?':{canonicalName:'string > 0','aliases?':'string[]'},signal:{title:'string > 0','summary?':'string','whyItMattersVerbatim?':'string','link?':HttpUrl,dateObserved:IsoDate,'firstSurfaced?':'string','stage?':'string','tags?':'string[]'},'+':'reject'});
export type DeriveInput=typeof DeriveInput.infer;
export const deterministicUuid=(value:string)=>{const h=sha256Hex(value);return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
export async function deriveFromRawEvent(db:PgliteDatabase<typeof schema>,raw:unknown){
 const input=DeriveInput.assert(raw);
 return db.transaction(async tx=>{
 const event=await tx.query.rawIngestionEvents.findFirst({where:eq(schema.rawIngestionEvents.id,input.rawEventId)});
 if(!event)throw new Error('Missing immutable raw event');RawIngestionEventSelect.assert(event);
 const prior=await tx.query.signalObservations.findFirst({where:eq(schema.signalObservations.rawEventId,input.rawEventId)});
 if(prior){const existing=await tx.query.signals.findFirst({where:eq(schema.signals.id,prior.signalId)});return {signalId:prior.signalId,sourceId:existing!.sourceId,actorId:existing!.actorId,isNewSignal:false,replayed:true};}
 const sourceId=stableSourceId(input.source);const sourceType=input.source.sourceTypeSlug;
 if(sourceType)await tx.insert(schema.sourceTypes).values({slug:sourceType,label:sourceType}).onConflictDoNothing();
 const sourceValues=SourceInsert.assert({id:sourceId,name:input.source.name,url:canonicalizeUrl(input.source.url),sourceTypeSlug:sourceType??null,discoveryMethod:'curated',status:'active',firstSeenAt:event.fetchedAt,lastCheckedAt:event.fetchedAt});
 const priorSource=await tx.query.sources.findFirst({where:eq(schema.sources.id,sourceId)});
 if(!priorSource)await tx.insert(schema.sources).values({...sourceValues,latestRawEventId:event.id});
 else {
 const winner=!priorSource.lastCheckedAt||event.fetchedAt>priorSource.lastCheckedAt||(event.fetchedAt.getTime()===priorSource.lastCheckedAt.getTime()&&event.id>(priorSource.latestRawEventId??''));
 await tx.update(schema.sources).set({firstSeenAt:event.fetchedAt<priorSource.firstSeenAt?event.fetchedAt:priorSource.firstSeenAt,...(winner?{name:sourceValues.name,url:sourceValues.url,sourceTypeSlug:sourceValues.sourceTypeSlug,lastCheckedAt:event.fetchedAt,latestRawEventId:event.id}:{})}).where(eq(schema.sources.id,sourceId));
 }
 const actorName=input.actor?.canonicalName.normalize('NFKC').trim();const actorId=actorName?deterministicUuid('actor:'+actorName):null;
 if(actorId){const priorActor=await tx.query.actors.findFirst({where:eq(schema.actors.id,actorId)});const aliases=[...new Set([...(priorActor?.aliases??[]),...(input.actor?.aliases??[])])].sort();if(priorActor)await tx.update(schema.actors).set({aliases,createdAt:event.fetchedAt<priorActor.createdAt?event.fetchedAt:priorActor.createdAt}).where(eq(schema.actors.id,actorId));else await tx.insert(schema.actors).values({id:actorId,canonicalName:actorName!,aliases,createdAt:event.fetchedAt});}
 const signalId=stableSignalId({link:input.signal.link,source:input.source.name,title:input.signal.title,firstSurfaced:input.signal.firstSurfaced});
 const existing=await tx.query.signals.findFirst({where:eq(schema.signals.id,signalId)});
 const values=SignalInsert.assert({id:signalId,sourceId,actorId,title:input.signal.title,summary:input.signal.summary??null,whyItMattersVerbatim:input.signal.whyItMattersVerbatim??null,link:input.signal.link?canonicalizeUrl(input.signal.link):null,dateObserved:new Date(input.signal.dateObserved+'T00:00:00Z'),firstSurfaced:input.signal.firstSurfaced??null,stage:input.signal.stage??null,tags:input.signal.tags??[],derivationVersion:DERIVATION_VERSION,derivedAt:event.fetchedAt,latestRawEventId:event.id});
 if(!existing)await tx.insert(schema.signals).values(values);
 // Timestamp orders observations; canonical UUID breaks equal-time ties.
 // The winner is stored rather than inferred from ingestion order.
 else if(event.fetchedAt>existing.derivedAt || (event.fetchedAt.getTime()===existing.derivedAt.getTime() && event.id>(existing.latestRawEventId??'')))await tx.update(schema.signals).set(values).where(eq(schema.signals.id,signalId));
 const observation=SignalObservationInsert.assert({id:deterministicUuid('observation:'+input.rawEventId),signalId,rawEventId:input.rawEventId,observedAt:event.fetchedAt,extractedFields:input.signal});
 await tx.insert(schema.signalObservations).values(observation).onConflictDoNothing();
 return {signalId,sourceId,actorId,isNewSignal:!existing,replayed:false};
 });
}
