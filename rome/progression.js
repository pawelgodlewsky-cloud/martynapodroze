export function resumePoint(state, dayId, id) {
  return {...state, done:state.done.filter(value => value !== id), skipped:(state.skipped || []).filter(value => value !== id), current:{...state.current,[dayId]:id}};
}
export function resetDay(state, dayId, ids) {
  return {...state, done:state.done.filter(id => !ids.includes(id)), skipped:(state.skipped || []).filter(id => !ids.includes(id)), current:{...state.current,[dayId]:ids[0] || null}};
}
export function togglePoint(state, dayId, id, ids) {
  if (state.done.includes(id)) return resumePoint(state,dayId,id);
  const done = [...state.done,id];
  const index = ids.indexOf(id);
  const skipped = (state.skipped || []).filter(value => value !== id);
  const next = ids.slice(index+1).find(value => !done.includes(value) && !skipped.includes(value)) || ids.find(value => !done.includes(value) && !skipped.includes(value)) || null;
  return {...state,done,skipped,current:{...state.current,[dayId]:next}};
}

export function skipPoint(state, dayId, id, ids) {
  const skipped = [...new Set([...(state.skipped || []),id])];
  const done = state.done.filter(value => value !== id);
  const index = ids.indexOf(id);
  const next = ids.slice(index+1).find(value => !done.includes(value) && !skipped.includes(value)) || ids.find(value => !done.includes(value) && !skipped.includes(value)) || null;
  return {...state,done,skipped,current:{...state.current,[dayId]:next}};
}

export function pointStatus(state, id) {
  if (state.done.includes(id)) return "DONE";
  if ((state.skipped || []).includes(id)) return "SKIPPED";
  return "TODO";
}
