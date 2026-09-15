import type {PgliteDatabase} from 'drizzle-orm/pglite';
import * as schema from './schema/index.js';
import {RawIngestionEventInsert} from './validators.js';
/** Runtime validation occurs before any database writes. Never include private bronze rows in public exports. */
export async function insertRawEvent(db:PgliteDatabase<typeof schema>,input:unknown){const valid=RawIngestionEventInsert.assert(input);await db.insert(schema.rawIngestionEvents).values(valid).onConflictDoNothing();}
