import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';import {drizzle} from 'drizzle-orm/pglite';import * as schema from '../packages/data/src/db/schema/index.js';import {deriveFromRawEvent,deterministicUuid} from '../packages/data/src/db/derive/deriveSignal.js';import {insertRawEvent} from '../packages/data/src/db/ingest.js';import {transform,csv,sha} from '../scripts/pipeline.js';import {HttpUrl,Input,Radar} from '../src/lib/contracts.js';import {canonicalizeUrl} from '../packages/data/src/db/derive/normalize.js';
const input=JSON.parse(await readFile('data/historical-input.json','utf8'));
test('real workbook reconciliation and deterministic public export',()=>{const a=transform(input);assert.equal(a.signals.length,172);assert.equal(a.provenance.legacyCount,143);assert.equal(a.provenance.additionalRows,29);assert.equal(a.asOf,'2026-06-19');assert.equal(JSON.stringify(a),JSON.stringify(transform(structuredClone(input))));assert.equal(new Set(a.signals.map(s=>s.id)).size,172);assert.equal(a.history.at(-1)?.total,172);for(const s of a.signals){assert.ok(HttpUrl.allows(s.link));assert.deepEqual(Object.keys(s).sort(),['actor','actorId','date','id','link','row','source','sourceId','sourceType','stage','title'].sort());}});
test('malformed URLs/dates, forbidden prose and duplicate rows fail closed',()=>{for(const patch of [{link:'javascript:alert(1)'},{date:'2026-02-30'},{summary:'Private prose'},{date:'not-a-date'}]){const bad=structuredClone(input);Object.assign(bad.rows[0],patch);assert.throws(()=>transform(bad));}const bad=structuredClone(input);bad.rows.push(bad.rows[0]);assert.throws(()=>transform(bad));assert.ok(!HttpUrl.allows('https://user:password@example.com'));assert.ok(!Input.allows({...input,privateNotes:'secret'}));});
test('CSV escapes quotes, line breaks and spreadsheet formulas',()=>{assert.equal(csv([{title:'=2+2',source:'a"b'}]),'"title","source"\r\n"\'=2+2","a""b"\r\n');});
test('URL normalization preserves ports and removes tracking',()=>{assert.equal(canonicalizeUrl('https://EXAMPLE.com:8443/a/?utm_source=x&b=2'),'https://example.com:8443/a?b=2');});
test('native database validation, replay, actor uniqueness and real stage history',async()=>{const client=new PGlite();const db=drizzle(client,{schema});try{for(const f of (await readdir('packages/data/migrations')).filter(f=>f.endsWith('.sql')).sort())await client.exec(await readFile('packages/data/migrations/'+f,'utf8'));const runId=deterministicUuid('run');await db.insert(schema.ingestionRuns).values({id:runId,trigger:'backfill'});const payload={source:{name:'Example',url:'https://example.com'},actor:{canonicalName:'Example actor'},signal:{title:'Test fixture',dateObserved:'2026-01-01',link:'https://example.com/item',stage:'Piloted'}};const eventId=deterministicUuid('first');const event={id:eventId,runId,sourceUrl:'https://example.com/item',extractionMethod:'manual' as const,contentHash:sha(JSON.stringify(payload)),rawPayload:payload,fetchedAt:new Date('2026-01-01T00:00:00Z')};await assert.rejects(insertRawEvent(db,{...event,contentHash:'bad'}));await insertRawEvent(db,event);await deriveFromRawEvent(db,{...payload,rawEventId:eventId});const before=await db.select().from(schema.signalObservations);await deriveFromRawEvent(db,{...payload,rawEventId:eventId});assert.deepEqual(await db.select().from(schema.signalObservations),before);const nextId=deterministicUuid('second');await insertRawEvent(db,{...event,id:nextId,fetchedAt:new Date('2026-01-02T00:00:00Z')});await deriveFromRawEvent(db,{...payload,rawEventId:nextId,signal:{...payload.signal,stage:'Launched'}});assert.equal((await db.select().from(schema.signals)).length,1);assert.equal((await db.select().from(schema.actors)).length,1);assert.equal((await db.select().from(schema.signalObservations)).length,2);assert.equal((await db.select().from(schema.signals))[0]?.stage,'Launched');await assert.rejects(deriveFromRawEvent(db,{...payload,rawEventId:nextId,signal:{...payload.signal,link:'javascript:bad'}}));}finally{await client.close();}});

test('equal-time conflicting observations have identical projections in opposite replay orders', async () => {
  const eventIds = [deterministicUuid('tie-a'), deterministicUuid('tie-b')].sort();
  const fetchedAt = new Date('2026-01-03T12:00:00Z');
  async function replay(order: number[]) {
    const client = new PGlite();
    const db = drizzle(client, { schema });
    try {
      for (const file of (await readdir('packages/data/migrations')).filter(f => f.endsWith('.sql')).sort()) {
        await client.exec(await readFile('packages/data/migrations/' + file, 'utf8'));
      }
      const runId = deterministicUuid('tie-run');
      await db.insert(schema.ingestionRuns).values({ id: runId, trigger: 'backfill' });
      const inputs = eventIds.map((id, index) => ({
        rawEventId: id!,
        source: { name: `Tie fixture source ${index}`, url: 'https://example.com' },
        actor: { canonicalName: `Tie fixture actor ${index}`, aliases: [`alias-${index}`] },
        signal: {
          title: `Equal-time fixture ${index}`, link: 'https://example.com/tie', dateObserved: index === 0 ? '2026-01-02' : '2026-01-03',
          stage: index === 0 ? 'Piloted' : 'Launched',
          summary: `Fixture version ${index}`, tags: [`version-${index}`],
        },
      }));
      for (const item of inputs) {
        await insertRawEvent(db, {
          id: item.rawEventId, runId, sourceUrl: item.signal.link, fetchedAt,
          extractionMethod: 'manual', contentHash: sha(JSON.stringify(item)), rawPayload: item,
        });
      }
      for (const [position,index] of order.entries()) {
        await deriveFromRawEvent(db, inputs[index]);
        if(position===0)await client.exec("UPDATE sources SET status='retired', cadence='manual cadence', notes='reviewed note', what_to_pull='reviewed scope'");
      }
      // Replaying a losing event cannot displace the stable winner or add history.
      await deriveFromRawEvent(db, inputs[0]);
      const signals = await db.select().from(schema.signals);
      const observations = (await db.select().from(schema.signalObservations)).sort((a, b) => a.id.localeCompare(b.id));
      assert.equal(signals.length, 1);
      assert.equal(signals[0]!.stage, 'Launched');
      assert.equal(signals[0]!.latestRawEventId, eventIds[1]);
      assert.equal(signals[0]!.title, 'Equal-time fixture 1');
      const source=(await db.select().from(schema.sources))[0]!;assert.equal(source.name,'Tie fixture source 1');assert.equal(source.status,'retired');assert.equal(source.notes,'reviewed note');assert.equal(source.whatToPull,'reviewed scope');
      assert.equal(observations.length, 2);
      // Verify upgrading a legacy projection also restores the same stable winner.
      await client.exec("UPDATE signals SET stage = 'incorrect legacy tie winner', latest_raw_event_id = NULL");
      const backfill = (await readFile('packages/data/migrations/0003_projection_tie_break.sql', 'utf8')).split('\n').slice(1).join('\n');
      await client.exec(backfill);
      assert.deepEqual((await db.select().from(schema.signals)).map(s=>({...s,derivationVersion:signals[0]!.derivationVersion})), signals);
      return { signals, observations, sources:await db.select().from(schema.sources), actors:(await db.select().from(schema.actors)).sort((a,b)=>a.id.localeCompare(b.id)) };
    } finally {
      await client.close();
    }
  }
  assert.deepEqual(await replay([0, 1]), await replay([1, 0]));
});

test('full export contracts reject malformed aggregates and preserve unknown dates',()=>{const data=transform(input);for(const change of [(d:any)=>{d.sources[0].url='javascript:bad';},(d:any)=>{d.actors[0].count++;},(d:any)=>{d.history[0].added.push('absent');},(d:any)=>{d.provenance.workbookSha256='bad';},(d:any)=>{d.privateNotes='excluded';}]){const bad=structuredClone(data);change(bad);assert.throws(()=>Radar.assert(bad));}const missing=structuredClone(input);missing.rows[0].date=null;const out=transform(missing);assert.equal(out.signals.find(s=>s.row===missing.rows[0].row)?.date,null);assert.ok(out.history.some(h=>h.date===null));});
test('legacy reconciliation reports exact archival changes without mutating workbook',async()=>{const {reconcile}=await import('../scripts/reconcile.js');const legacy=JSON.parse(await readFile('data/legacy-input.json','utf8'));const before=JSON.stringify(input);const report=reconcile(input.rows,legacy);assert.equal(report.addedRows.length,29);assert.deepEqual(report.removedRows,[]);assert.equal(report.differences.filter(x=>x.field==='date').length,4);assert.equal(report.differences.filter(x=>x.field==='link').length,3);assert.equal(JSON.stringify(input),before);assert.deepEqual(report,reconcile(structuredClone(input.rows),structuredClone(legacy)));assert.throws(()=>reconcile(input.rows,[{...legacy[0],privateNotes:'bad'}]));});

test('actual downloadable JSON, CSV and history match the validated reviewed package',async()=>{const expected=transform(input);const exported=Radar.assert(JSON.parse(await readFile('public/exports/radar.json','utf8')));assert.deepEqual(exported,expected);assert.equal(await readFile('public/exports/signals.csv','utf8'),csv(exported.signals));assert.deepEqual(JSON.parse(await readFile('public/exports/history.json','utf8')),exported.history);const {Reconciliation,reconcile}=await import('../scripts/reconcile.js');assert.deepEqual(Reconciliation.assert(JSON.parse(await readFile('public/exports/reconciliation.json','utf8'))),reconcile(input.rows,JSON.parse(await readFile('data/legacy-input.json','utf8'))));});
