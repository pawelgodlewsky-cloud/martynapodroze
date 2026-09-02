export function createStore(namespace, defaults) {
  const key = `mp:${namespace}:state:v1`;
  const clone = value => JSON.parse(JSON.stringify(value));
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      return saved && typeof saved === "object" ? { ...clone(defaults), ...saved } : clone(defaults);
    } catch { return clone(defaults); }
  };
  let state = load();
  return {
    key,
    get: () => state,
    set(patch) { state = { ...state, ...patch }; localStorage.setItem(key, JSON.stringify(state)); return state; },
    update(updater) { state = updater(clone(state)); localStorage.setItem(key, JSON.stringify(state)); return state; },
    reset() { state = clone(defaults); localStorage.removeItem(key); return state; }
  };
}

