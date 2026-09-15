import {type} from 'arktype';
import {HistoricalRow} from '../src/lib/contracts.js';
export const LegacyRows=type({row:'number.integer >= 2',date:'string | null',sourceType:'string',source:'string',actor:'string',stage:'string',title:'string',link:'string','+':'reject'}).array();
/** Match by archival row position and report every retained-field difference; never overwrite either record. */
export const Reconciliation=type({schemaVersion:'1',matchingRows:'number[]',addedRows:'number[]',removedRows:'number[]',differences:type({row:'number.integer >= 2',field:'string',legacy:'string | null',workbook:'string | null','+':'reject'}).array(),'+':'reject'});
export function reconcile(workbook:unknown,legacy:unknown){
 const current=HistoricalRow.array().assert(workbook),previous=LegacyRows.assert(legacy);
 const fields=['date','sourceType','source','actor','stage','title','link'] as const;
 return Reconciliation.assert({schemaVersion:1,matchingRows:previous.filter(old=>{const row=current.find(r=>r.row===old.row);return row&&fields.every(f=>row[f]===old[f]);}).map(r=>r.row),addedRows:current.filter(r=>!previous.some(p=>p.row===r.row)).map(r=>r.row),removedRows:previous.filter(r=>!current.some(p=>p.row===r.row)).map(r=>r.row),differences:previous.flatMap(old=>{const row=current.find(r=>r.row===old.row);return row?fields.filter(f=>row[f]!==old[f]).map(field=>({row:old.row,field,legacy:old[field],workbook:row[field]})):[];})});
}
