// Shared shell: state, storage, timer, coach, overlay, toast, generation.
// Classic scripts share one global scope, so the game files can use these.
const $ = id => document.getElementById(id);
const S = 100; // SVG units per cell

// ---------- storage ----------
const STORE_KEY = 'puzzleGym';
function loadStore() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; } }
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }
const store = loadStore();
store.stats = store.stats || {}; store.opts = store.opts || {}; store.sel = store.sel || {}; store.saves = store.saves || {};

// ---------- shared state ----------
let G = null;   // active game module
let P = null;   // active puzzle
let hints = 0, solved = false, elapsed = 0, t0 = 0, timerId = null, genToken = 0;
let flashCells = [], focusCells = [], flashT = null, popCell = -1;
let curSize = 8, curDiff = 'hard';
const DIFF_NAME = { normal: 'Normal', hard: 'Hard', expert: 'Expert' };
const opts = new Proxy({}, {
  get: (o, k) => { const v = (store.opts[G.id] || {})[k]; return v === undefined ? (G.toggles.find(t => t.key === k) || {}).def : v; },
  set: (o, k, v) => { store.opts[G.id] = store.opts[G.id] || {}; store.opts[G.id][k] = v; save(); return true; },
});

// ---------- timer ----------
function fmt(s) { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function tick() { elapsed = (performance.now() - t0) / 1000; $('timer').textContent = fmt(elapsed); }
function startTimer() { if (timerId || solved || !P) return; t0 = performance.now() - elapsed * 1000; timerId = setInterval(tick, 250); $('timer').classList.add('running'); }
function stopTimer() { if (timerId) { elapsed = (performance.now() - t0) / 1000; clearInterval(timerId); timerId = null; } $('timer').classList.remove('running'); }
function moved() { if (!solved) startTimer(); queueSave(); }

// ---------- coach, overlay, toast ----------
let lastCoach = '';
function coach(html, cls) {
  const el = $('coach');
  const body = html || `<span class="muted">${G && G.idle ? G.idle() : ''}</span>`;
  if (cls === 'bad' && body !== lastCoach) Sound.play('error');
  if (body !== lastCoach) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  lastCoach = body;
  el.className = 'coach bump ' + (cls || '');
  el.innerHTML = body;
}
function showOverlay(h) { const o = $('overlay'); o.innerHTML = `<div class="overlay-card">${h}</div>`; o.classList.add('show'); o.setAttribute('aria-hidden', 'false'); }
function hideOverlay() { const o = $('overlay'); o.classList.remove('show'); o.setAttribute('aria-hidden', 'true'); }
let toastT = null;
function toast(msg, action) {
  const t = $('toast');
  t.innerHTML = `<span class="toast-dot">✓</span><span>${msg}</span>` + (action ? `<button class="toast-btn" id="toastAct">${action.label}</button>` : '');
  t.classList.add('show');
  if (action) $('toastAct').onclick = () => { action.run(); t.classList.remove('show'); };
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3600);
}

// ---------- board drawing helpers ----------
function flash(cells, focus) {
  flashCells = cells || []; focusCells = focus || []; G.render();
  clearTimeout(flashT); flashT = setTimeout(() => { flashCells = []; focusCells = []; if (P) G.render(); }, 2400);
}
function cellFill(c, base) { return base; }
function highlights(N) {
  let h = '';
  for (const c of focusCells) if (!flashCells.includes(c)) h += `<rect class="hl-focus" x="${(c % N) * S + 5}" y="${Math.floor(c / N) * S + 5}" width="${S - 10}" height="${S - 10}" rx="10" fill="rgba(25,113,194,.10)" stroke="#1971c2" stroke-width="4" stroke-dasharray="8 6"/>`;
  for (const c of flashCells) h += `<rect class="hl-flash" x="${(c % N) * S + 4}" y="${Math.floor(c / N) * S + 4}" width="${S - 8}" height="${S - 8}" rx="10" fill="rgba(25,113,194,.26)" stroke="#1971c2" stroke-width="6"/>`;
  return h;
}
function cellAt(e, N) {
  const svg = $('board'); const r = svg.getBoundingClientRect(); const vb = svg.viewBox.baseVal;
  const x = vb.x + (e.clientX - r.left) / r.width * vb.width, y = vb.y + (e.clientY - r.top) / r.height * vb.height;
  const c = Math.floor(x / S), rr = Math.floor(y / S);
  if (c < 0 || rr < 0 || c >= N || rr >= N) return -1;
  return rr * N + c;
}
const cx = c => (c % P.N) * S + S / 2, cy = c => Math.floor(c / P.N) * S + S / 2;
function gridLines(N, col = '#e4e4e0') { let h = ''; const W = N * S; for (let i = 1; i < N; i++) h += `<line x1="${i * S}" y1="0" x2="${i * S}" y2="${W}" stroke="${col}" stroke-width="2"/><line x1="0" y1="${i * S}" x2="${W}" y2="${i * S}" stroke="${col}" stroke-width="2"/>`; return h; }
function frame(N) { return `<rect x="0" y="0" width="${N * S}" height="${N * S}" fill="none" stroke="#111" stroke-width="6" rx="12"/>`; }
// wrap a symbol so it pops when it was the cell just changed
function popWrap(i, x, y, svg) { return i === popCell ? `<g class="pop" style="transform-origin:${x}px ${y}px">${svg}</g>` : svg; }

// ---------- saved progress ----------
let saveT = null;
function queueSave() { clearTimeout(saveT); saveT = setTimeout(saveProgress, 300); }
function saveProgress() {
  if (!G || !P) return;
  if (solved) { delete store.saves[G.id]; save(); return; }
  const p = Object.assign({}, P); delete p._L;
  store.saves[G.id] = { puzzle: p, state: G.getState(), elapsed: timerId ? (performance.now() - t0) / 1000 : elapsed, hints };
  save();
}

// ---------- win ----------
function win() {
  solved = true; stopTimer(); popCell = -1; G.render();
  const key = G.id + '-' + P.N + '-' + P.diff; const st = store.stats[key] || { solves: 0, best: null, hintFree: 0, total: 0 };
  st.solves++; st.total += elapsed; if (!hints) { st.hintFree++; if (st.best == null || elapsed < st.best) st.best = elapsed; }
  store.stats[key] = st; delete store.saves[G.id]; save(); renderStats();
  const pb = !hints && st.best === elapsed;
  Sound.play('win');
  $('boardWrap').classList.add('won');
  setTimeout(() => $('boardWrap').classList.remove('won'), 900);
  setTimeout(() => {
    if (!solved) return;
    showOverlay(`<div class="win-badge">✓</div><h2>${pb ? 'New best!' : 'Solved'}</h2><p class="win-time">${fmt(elapsed)} · ${hints} hint${hints === 1 ? '' : 's'}</p><p class="muted">${hints ? 'Next time, try it with no hints and the helpers turned off.' : 'Clean solve. Try a bigger grid or a harder level.'}</p><div class="overlay-actions"><button class="btn primary" id="again">Next puzzle</button><button class="btn" id="view">View board</button></div>`);
    $('again').onclick = () => newPuzzle(randomSeed()); $('view').onclick = hideOverlay;
  }, 650);
  coach(G.winTip || 'Solved.', 'good');
}
function renderStats() {
  if (!G) return;
  const key = G.id + '-' + curSize + '-' + curDiff; const st = store.stats[key];
  const all = Object.entries(store.stats).filter(([k]) => k.startsWith(G.id + '-')).reduce((s, [, x]) => s + x.solves, 0);
  $('stats').innerHTML = `<div class="stat"><b>${st ? st.solves : 0}</b><small>solved here</small></div><div class="stat"><b>${st && st.best != null ? fmt(st.best) : '—'}</b><small>best, no hints</small></div><div class="stat"><b>${st && st.solves ? fmt(st.total / st.solves) : '—'}</b><small>average</small></div>` +
    `<p class="stats-note">${all} ${G.title} puzzle${all === 1 ? '' : 's'} solved · ${st && st.hintFree >= 3 ? 'Ready to move up a size or level.' : 'Solve 3 here with no hints, then move up.'}</p>`;
}

// ---------- generation (Web Workers, with prefetch) ----------
const GEN = { zip: (N, d, s) => generate(N, d, s), queens: genQueens, tango: genTango, dispatch: genDispatch };
function makeWorker() { try { return new Worker('js/worker.js'); } catch (e) { return null; } }
let worker = null, prefetcher = null;
const prefetched = {}; // key -> puzzle
function randomSeed() { return (Math.random() * 2 ** 31) | 0; }
function dayStr() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function dailySeed(id, N, diff) { return hashStr(id + '|' + dayStr() + '|' + N + '|' + diff); }
function prefetch() {
  if (!G) return; const key = G.id + '-' + curSize + '-' + curDiff; if (prefetched[key]) return;
  if (prefetcher === null) prefetcher = makeWorker() || false;
  if (!prefetcher) return;
  const want = { game: G.id, N: curSize, diff: curDiff, seed: randomSeed(), token: key };
  prefetcher.onmessage = e => { prefetched[e.data.token] = e.data.puzzle; };
  prefetcher.onerror = () => { prefetcher = false; };
  prefetcher.postMessage(want);
}
function newPuzzle(seed, label, useCache = true) {
  const N = curSize, diff = curDiff; store.sel[G.id] = { N, diff }; save();
  const token = ++genToken; const gid = G.id; const key = gid + '-' + N + '-' + diff;
  stopTimer();
  const done = p => { if (token !== genToken || !G || G.id !== gid) return; p.label = label; begin(p); };
  if (!label && useCache && prefetched[key]) { const p = prefetched[key]; delete prefetched[key]; done(p); return; }
  showOverlay('<div class="spin"></div><p class="muted">Building a puzzle with exactly one solution…</p>');
  const local = () => setTimeout(() => done(GEN[gid](N, diff, seed)), 40);
  if (worker === null) worker = makeWorker() || false;
  if (worker) {
    worker.onmessage = e => { if (e.data.token === genToken) done(e.data.puzzle); };
    worker.onerror = () => { worker = false; local(); };
    worker.postMessage({ game: gid, N, diff, seed, token });
  } else local();
}
function begin(p, resume) {
  P = p; hints = resume ? resume.hints : 0; solved = false; elapsed = resume ? resume.elapsed : 0; stopTimer();
  $('timer').textContent = fmt(elapsed); flashCells = []; focusCells = []; popCell = -1;
  hideOverlay(); G.start(p); if (resume) G.setState(resume.state);
  $('info').textContent = (p.label || ('Puzzle #' + p.seed)) + ' · ' + DIFF_NAME[p.diff] + ' · ' + G.describe(p);
  coach(resume ? 'Welcome back. Your puzzle is where you left it.' : G.intro);
  const svg = $('board'); svg.classList.remove('enter'); void svg.getBoundingClientRect(); svg.classList.add('enter');
  G.render(); renderStats(); queueSave();
  setTimeout(prefetch, 400);
}
