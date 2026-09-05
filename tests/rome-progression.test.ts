import {describe,it,expect} from 'vitest';
import {resumePoint,resetDay,togglePoint} from '../rome/progression.js';
const base = {done:[],current:{},saved:['trevi'],expenses:[{amount:5}]};
describe('Rome route progression',()=>{
  it('advances then restores a previous point',()=>{
    const next=togglePoint(base,'day-1','a',['a','b']);
    expect(next.current['day-1']).toBe('b');
    const back=resumePoint(next,'day-1','a');
    expect(back.done).toEqual([]); expect(back.current['day-1']).toBe('a');
  });
  it('can undo completion of the final point',()=>{
    const completed=togglePoint({...base,done:['a']},'day-1','b',['a','b']);
    expect(completed.current['day-1']).toBeNull();
    const back=resumePoint(completed,'day-1','b');
    expect(back.done).toEqual(['a']); expect(back.current['day-1']).toBe('b');
  });
  it('resets only selected day points, preserving personal data',()=>{
    const reset=resetDay({...base,done:['a','b','trevi'],current:{'day-2':'trevi'}},'day-1',['a','b']);
    expect(reset.done).toEqual(['trevi']); expect(reset.saved).toEqual(base.saved);
    expect(reset.expenses).toEqual(base.expenses); expect(reset.current['day-2']).toBe('trevi');
  });
  it('unmark returns to that point, without skipping it',()=>{
    const result=togglePoint({...base,done:['a']},'day-1','a',['a','b']);
    expect(result.current['day-1']).toBe('a'); expect(result.done).toEqual([]);
  });
});
