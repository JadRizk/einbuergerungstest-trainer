/* The few helpers every page needs, shared so they cannot drift apart. */

/* fetch a JSON file, failing on an HTTP error rather than on its body */
export const json = url => fetch(url).then(r => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); });

export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* a localStorage value, or null when it is missing, unreadable or blocked;
   and the write, which fails quietly where storage is blocked */
export const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
export const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
