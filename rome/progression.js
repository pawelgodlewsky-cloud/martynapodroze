export function resumePoint(state, dayId, id) {
  return {...state, done:state.done.filter(value => value !== id), current:{...state.current,[dayId]:id}};
}
export function resetDay(state, dayId, ids) {
  return {...state, done:state.done.filter(id => !ids.includes(id)), current:{...state.current,[dayId]:ids[0] || null}};
}
export function togglePoint(state, dayId, id, ids) {
  if (state.done.includes(id)) return resumePoint(state,dayId,id);
  const done = [...state.done,id];
  const index = ids.indexOf(id);
  const next = ids.slice(index+1).find(value => !done.includes(value)) || ids.find(value => !done.includes(value)) || null;
  return {...state,done,current:{...state.current,[dayId]:next}};
}
