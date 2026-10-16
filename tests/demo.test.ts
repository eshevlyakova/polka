import {it,expect} from 'vitest';
import {createDemoState} from '../apps/web/src/data/demo';
import {parseState} from '../apps/web/src/storage/repository';
it('demo is a coherent two-week diary with variety and linked leftover',()=>{const s=createDemoState(new Date('2026-10-16T12:00:00'));expect(new Set(s.diary.map(e=>e.date)).size).toBe(14);expect(new Set(s.diary.map(e=>e.name)).size).toBeGreaterThan(5);expect(s.diary.some(e=>e.source==='Кафе · оценка')).toBe(true);const b=s.batches[0];const eaten=s.diary.filter(e=>e.batchId===b.id).reduce((n,e)=>n+(e.fraction??0),0);expect(b.remainingFraction+eaten).toBeCloseTo(1);expect(parseState(s)).toEqual(s);});
