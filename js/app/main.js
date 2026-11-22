// App wiring: home, tabs, controls, input, sound, routing.
const GAMES={dispatch:Dispatch,zip:Zip,queens:Queens,tango:Tango};
const ICONS={
 dispatch:`<svg viewBox="0 0 76 76"><rect width="76" height="76" fill="#fff"/><rect x="8" y="44" width="12" height="24" rx="3" fill="#ffa94d"/><rect x="24" y="28" width="12" height="40" rx="3" fill="#ffa94d"/><rect x="40" y="36" width="12" height="32" rx="3" fill="#ffa94d"/><rect x="56" y="20" width="12" height="48" rx="3" fill="#e8590c"/><path d="M40 4 L30 20 H38 L34 32 L46 14 H38 Z" fill="#111"/></svg>`,
 zip:`<svg viewBox="0 0 76 76"><rect width="76" height="76" fill="#fff"/><path d="M14 14 H62 V30 H14 V46 H62 V62 H14" fill="none" stroke="#e8590c" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="14" cy="14" r="8" fill="#111"/><circle cx="14" cy="62" r="8" fill="#111"/></svg>`,
 queens:`<svg viewBox="0 0 76 76"><rect width="38" height="38" fill="#ffc9c9"/><rect x="38" width="38" height="38" fill="#a5d8ff"/><rect y="38" width="38" height="38" fill="#c0eb75"/><rect x="38" y="38" width="38" height="38" fill="#ffec99"/><path d="M10 30 L8 12 L16 20 L22 8 L28 20 L36 12 L34 30 Z" transform="translate(2 2)" fill="#111"/><path d="M10 30 L8 12 L16 20 L22 8 L28 20 L36 12 L34 30 Z" transform="translate(36 38)" fill="#111"/></svg>`,
 tango:`<svg viewBox="0 0 76 76"><rect width="76" height="76" fill="#fff"/><circle cx="20" cy="20" r="11" fill="#f59f00" stroke="#e8590c" stroke-width="3"/><path d="M58 8 A12 12 0 1 0 66 26 A9 9 0 1 1 58 8Z" fill="#4dabf7" stroke="#1971c2" stroke-width="3"/><path d="M54 46 A12 12 0 1 0 62 64 A9 9 0 1 1 54 46Z" fill="#4dabf7" stroke="#1971c2" stroke-width="3"/><circle cx="20" cy="58" r="11" fill="#f59f00" stroke="#e8590c" stroke-width="3"/><circle cx="38" cy="20" r="7" fill="#fff" stroke="#999" stroke-width="1.5"/><text x="38" y="21" font-size="11" text-anchor="middle" dominant-baseline="central" font-weight="700">×</text></svg>`};
const BLURB={dispatch:['Run the grid: meet every hour\'s demand and every plant\'s daily energy, with ramp limits.','Trains: headroom and bounds reasoning, like a trading desk'],
 zip:['One path through every cell, hitting the numbers in order. Walls block you.','Trains: seeing forced cells and dead ends'],
 queens:['One queen per row, column and coloured region. Queens can\'t touch.','Trains: elimination and pigeonhole logic'],
 tango:['Fill the grid with suns and moons, balanced in every line, never three in a row.','Trains: chains of deductions and "what if" tests']};

// ---------- home ----------
function solvedCount(id){return Object.entries(store.stats).filter(([k])=>k.startsWith(id+'-')).reduce((s,[,x])=>s+x.solves,0)}
function renderHome(){
  $('cards').innerHTML=Object.values(GAMES).map((m,i)=>{const n=solvedCount(m.id);const resume=store.saves[m.id];
    return `<button class="gcard" data-g="${m.id}" style="--i:${i}"><span class="gicon">${ICONS[m.id]}</span><span class="gbody"><span class="gtitle">${m.title}${m.id==='dispatch'?'<span class="badge">Original</span>':''}</span><span class="gdesc">${BLURB[m.id][0]}</span><span class="gtag">${BLURB[m.id][1]}</span><span class="gfoot">${resume?'<span class="resume">● In progress</span>':''}${n?`<span>${n} solved</span>`:''}</span></span><span class="garrow" aria-hidden="true">→</span></button>`}).join('');
  document.querySelectorAll('.gcard').forEach(b=>b.onclick=()=>{location.hash=b.dataset.g});
  const total=Object.values(store.stats).reduce((s,x)=>s+x.solves,0);
  $('homeStats').textContent=total?`${total} puzzle${total===1?'':'s'} solved so far`:'Pick a game to start';
}
function renderTabs(active){
  $('tabs').innerHTML=`<button class="tab ${!active?'on':''}" data-g="">Home</button>`+Object.values(GAMES).map(m=>`<button class="tab ${active===m.id?'on':''}" data-g="${m.id}">${m.title}</button>`).join('');
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{location.hash=b.dataset.g});
  const on=$('tabs').querySelector('.on');if(on)on.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function seg(el,items,val,onPick){
  el.innerHTML=items.map(([v,l])=>`<button class="seg-btn ${String(v)===String(val)?'on':''}" data-v="${v}" role="radio" aria-checked="${String(v)===String(val)}">${l}</button>`).join('');
  el.querySelectorAll('.seg-btn').forEach(b=>b.onclick=()=>{if(b.classList.contains('on'))return;el.querySelectorAll('.seg-btn').forEach(x=>{x.classList.remove('on');x.setAttribute('aria-checked','false')});b.classList.add('on');b.setAttribute('aria-checked','true');onPick(b.dataset.v)});
}
function showView(id){
  for(const v of ['home','game']){const el=$(v);if(v===id){el.hidden=false;el.classList.remove('enter');void el.offsetWidth;el.classList.add('enter')}else el.hidden=true}
  $('timer').hidden=id!=='game';window.scrollTo({top:0,behavior:'instant'in window?'instant':'auto'});
}

// ---------- open a game ----------
function openGame(id){
  if(G&&P)saveProgress();
  genToken++;stopTimer();G=GAMES[id];P=null;renderTabs(id);showView('game');
  $('gTitle').textContent=G.title;$('gSub').textContent=BLURB[id][0];
  const sel=store.sel[id]||{};curSize=G.sizes.includes(sel.N)?sel.N:G.defSize;curDiff=sel.diff||'hard';
  seg($('sizeSeg'),G.sizes.map(n=>[n,n+'×'+n]),curSize,v=>{curSize=+v;renderStats();newPuzzle(randomSeed())});
  seg($('diffSeg'),[['normal','Normal'],['hard','Hard'],['expert','Expert']],curDiff,v=>{curDiff=v;renderStats();newPuzzle(randomSeed())});
  $('toggles').innerHTML=G.toggles.map(t=>`<button class="chip" data-k="${t.key}" aria-pressed="${!!opts[t.key]}" data-sound="toggle"><span class="chip-dot"></span>${t.label}</button>`).join('');
  document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{const k=b.dataset.k;opts[k]=!opts[k];b.setAttribute('aria-pressed',opts[k]);if(P)G.render()});
  $('tips').innerHTML=G.tips;$('timer').textContent='0:00';$('board').innerHTML='';$('progress').textContent='';$('info').textContent='';
  const saved=store.saves[id];
  if(saved&&saved.puzzle){curSize=saved.puzzle.N;curDiff=saved.puzzle.diff;
    seg($('sizeSeg'),G.sizes.map(n=>[n,n+'×'+n]),curSize,v=>{curSize=+v;renderStats();newPuzzle(randomSeed())});
    seg($('diffSeg'),[['normal','Normal'],['hard','Hard'],['expert','Expert']],curDiff,v=>{curDiff=v;renderStats();newPuzzle(randomSeed())});
    try{begin(saved.puzzle,saved);return}catch(e){delete store.saves[id];save()}}
  newPuzzle(dailySeed(id,curSize,curDiff),'Daily '+dayStr());
}
function goHome(){if(G&&P)saveProgress();genToken++;stopTimer();G=null;P=null;hideOverlay();renderTabs(null);showView('home');renderHome()}
function route(){const id=location.hash.slice(1);if(GAMES[id])openGame(id);else goHome()}

// render wrapper keeps progress text, undo state and the tap ripple in sync
for(const m of Object.values(GAMES)){const r=m.render;m.render=function(){if(!P)return;r();
  if(popCell>=0&&!solved){const N=P.N;$('board').insertAdjacentHTML('beforeend',`<circle class="ripple" cx="${cx(popCell)}" cy="${cy(popCell)}" r="${S*.42}" fill="none" stroke="#111" stroke-width="3"/>`)}
  popCell=-1;$('progress').textContent=m.progress();$('undoBtn').disabled=!m.canUndo()||solved;$('resetBtn').disabled=solved;$('hintBtn').disabled=solved}}

// ---------- input ----------
const board=$('board');
board.addEventListener('pointerdown',e=>{if(!P||!G)return;Sound.unlock();try{board.setPointerCapture(e.pointerId)}catch(_){}G.down(e)});
board.addEventListener('pointermove',e=>{if(P&&G)G.move(e)});
['pointerup','pointercancel'].forEach(ev=>board.addEventListener(ev,()=>{if(P&&G)G.up()}));
$('newBtn').onclick=()=>newPuzzle(randomSeed());
$('dailyBtn').onclick=()=>newPuzzle(dailySeed(G.id,curSize,curDiff),'Daily '+dayStr());
$('undoBtn').onclick=()=>{if(P&&!solved)G.undo()};
// Reset is a fresh start: clear the board, the timer and the hint count. The toast's Undo brings all three back.
$('resetBtn').onclick=()=>{if(!P||solved)return;
  const wasRunning=!!timerId;stopTimer();const prev={elapsed,hints,wasRunning};
  const undoBoard=G.reset();
  elapsed=0;hints=0;$('timer').textContent='0:00';queueSave();
  toast('Board and timer reset',{label:'Undo',run:()=>{if(!P||solved)return;if(undoBoard)undoBoard();elapsed=prev.elapsed;hints=prev.hints;$('timer').textContent=fmt(elapsed);if(prev.wasRunning)startTimer();queueSave()}});
};
$('hintBtn').onclick=()=>{if(P&&!solved){Sound.play('hint');G.hint();queueSave()}};
$('homeBtn').onclick=()=>{location.hash=''};
function paintSound(){const b=$('soundBtn');b.setAttribute('aria-pressed',Sound.enabled);b.setAttribute('aria-label',Sound.enabled?'Sound on':'Sound off');b.innerHTML=Sound.enabled?
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>':
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>'}
$('soundBtn').onclick=e=>{e.stopPropagation();Sound.setEnabled(!Sound.enabled);paintSound()};
paintSound();

// every button clicks; specific actions can override with data-sound
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.id==='soundBtn'||b.disabled)return;
  const s=b.dataset.sound||(b.id==='undoBtn'||b.id==='homeBtn'?'soft':b.id==='hintBtn'?null:'select');if(s)Sound.play(s)},true);
document.addEventListener('pointerdown',()=>Sound.unlock(),{once:true,capture:true});

// keyboard: Ctrl/Cmd+Z undo, H hint, N new, Esc closes the overlay, arrows drive Zip
document.addEventListener('keydown',e=>{
  if(!G||!P)return;const t=e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(!solved){G.undo()}return}
  if(e.key==='Escape'){hideOverlay();return}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='h'||e.key==='H'){$('hintBtn').click();return}
  if(e.key==='n'||e.key==='N'){$('newBtn').click();return}
  if(G.key&&!solved&&G.key(e.key))e.preventDefault();
});
// save when the page is hidden or closed
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(timerId){stopTimer();saveProgress();$('timer').dataset.paused='1'}}else if($('timer').dataset.paused){delete $('timer').dataset.paused;if(P&&!solved&&elapsed>0)startTimer()}});
window.addEventListener('pagehide',saveProgress);
window.addEventListener('hashchange',route);

// offline support when hosted (not available inside some embedded previews)
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})})}

route();
