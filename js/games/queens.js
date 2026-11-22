// Queens: one queen per row, column and region; queens never touch.
const Queens=(()=>{
  const COLORS=['#ffc9c9','#ffd8a8','#ffec99','#c0eb75','#96f2d7','#a5d8ff','#d0bfff','#eebefa','#ced4da','#e6c9a8'];
  let st,hist,L,down=null,dragMode=false,lastDrag=-1;
  const snap=()=>{hist.push(st.slice());if(hist.length>300)hist.shift()};
  function conflicts(){const N=P.N,bad=new Set();for(let q=0;q<N*N;q++)if(st[q]===2)for(const a of qAttacks(N,P.reg,q))if(st[a]===2){bad.add(q);bad.add(a)}
    const empty=[];for(const l of L){if(!l.cells.some(i=>st[i]===2)&&!l.cells.some(i=>st[i]===0&&!attacked(i)))empty.push(l)}return{bad,empty}}
  function attacked(i){for(let q=0;q<P.N*P.N;q++)if(st[q]===2&&q!==i&&qAttacks(P.N,P.reg,q).includes(i))return true;return false}
  function check(){const N=P.N;const qs=[];for(let i=0;i<N*N;i++)if(st[i]===2)qs.push(i);
    if(qs.length===N&&!conflicts().bad.size){win();return}
    if(opts.alarm){const c=conflicts();if(c.bad.size){coach('⚠ Two queens clash: they share a row, column or region, or they touch. The clashing queens are in red.','bad');return}
      if(c.empty.length){const l=c.empty[0];coach(`⚠ ${l.kind==='reg'?'A region':l.kind==='row'?'Row '+(l.id+1):'Column '+(l.id+1)} has no cell left for a queen. Something above is wrong.`,'bad');return}}
    coach('')}
  function setCell(i,v){if(st[i]===v)return;st[i]=v;popCell=i;if(v===2&&opts.autox)for(const a of qAttacks(P.N,P.reg,i))if(st[a]===0)st[a]=1}
  const M={id:'queens',title:'Queens',sizes:[6,7,8,9,10],defSize:8,
    toggles:[{key:'alarm',label:'Clash alarm',def:true},{key:'autox',label:'Auto-cross',def:false},{key:'counts',label:'Region counts',def:false}],
    intro:'Put one queen in every row, column and coloured region. Queens can\'t touch, not even diagonally. Tap once for ✕, twice for a queen. Drag to cross out several cells.',
    winTip:'Solved. Look back: which region or row gave you your first queen? That is usually the tightest spot.',
    idle:()=>{const n=[...st].filter(v=>v===2).length;return `${n} of ${P.N} queens placed`},
    describe:p=>p.N+' regions · logic level '+p.level,
    tips:`<ol><li><b>Start with the smallest region.</b> A region with only one or two cells nearly places its own queen. <i>Region counts</i> shows how many cells each region has left.</li><li><b>A region inside one row or column</b> owns that line's queen, so cross out every other cell in that line.</li><li><b>A row or column inside one region</b> works the other way: cross out the rest of that region.</li><li><b>Pigeonhole.</b> If 2 regions fit inside the same 2 rows, those rows' queens are taken. Cross out everything else in those rows. The same works for 3 and 3.</li><li><b>"What if" test.</b> Picture a queen on a cell. If it would cross out every cell of some region, row or column, that cell is out.</li><li><b>Neighbours.</b> Two cells side by side in a two-cell region can't both be empty of a queen, so the cells around both of them are out.</li></ol>`,
    getState:()=>Array.from(st),
    setState(s){if(s&&s.length===st.length)st=Uint8Array.from(s)},
    start(p){st=new Uint8Array(p.N*p.N);hist=[];L=qLines(p.N,p.reg)},
    progress:()=>[...st].filter(v=>v===2).length+'/'+P.N+' queens',
    canUndo:()=>hist.length>0,
    undo(){if(hist.length){st=hist.pop();Sound.play('soft');queueSave();G.render();check()}},
    reset(){snap();st.fill(0);queueSave();G.render();coach('Cleared. Find the tightest region first.');return()=>M.undo()},
    hint(){const N=P.N;const sol=new Set(P.solution);hints++;
      const wrongQ=[];const wrongX=[];for(let i=0;i<N*N;i++){if(st[i]===2&&!sol.has(i))wrongQ.push(i);if(st[i]===1&&sol.has(i))wrongX.push(i)}
      if(wrongQ.length){coach(`This queen is in the wrong place. <button id="fx">Remove it</button>`,'bad');$('fx').onclick=()=>{snap();st[wrongQ[0]]=0;G.render();coach('Removed.')};flash([wrongQ[0]]);return}
      if(wrongX.length){coach(`You crossed out a cell that needs a queen. <button id="fx">Clear that ✕</button>`,'bad');$('fx').onclick=()=>{snap();st[wrongX[0]]=0;G.render();coach('Cleared.')};flash([wrongX[0]]);return}
      const s=qStep(N,P.reg,st.slice(),6,L);snap();
      if(!s){const q=P.solution.find(i=>st[i]!==2);setCell(q,2);flash([q]);coach('No simple step is left from here, so I\'ve placed a queen for you.');G.render();check();return}
      for(const c of s.cells)st[c]=s.type==='Q'?2:Math.max(st[c],1);moved();flash(s.cells,s.focus);
      coach(`Hint (${['','basic','basic','line','pigeonhole','what-if','deep what-if'][s.level]}): ${s.reason}`);G.render();
      const qs=[...st].filter(v=>v===2).length;if(qs===N&&!conflicts().bad.size)win()},
    render(){const N=P.N,T=N*N,W=N*S,reg=P.reg;const svg=$('board');svg.setAttribute('viewBox',`-6 -6 ${W+12} ${W+12}`);
      const c=!solved&&opts.alarm?conflicts():{bad:new Set(),empty:[]};const emptyCells=new Set(c.empty.flatMap(l=>l.cells));let h='';
      h+=`<defs><pattern id="hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="16" fill="rgba(224,49,49,.45)"/></pattern></defs>`;
      for(let i=0;i<T;i++){h+=`<rect x="${(i%N)*S}" y="${Math.floor(i/N)*S}" width="${S}" height="${S}" fill="${COLORS[reg[i]%COLORS.length]}"/>`;if(emptyCells.has(i))h+=`<rect x="${(i%N)*S}" y="${Math.floor(i/N)*S}" width="${S}" height="${S}" fill="url(#hatch)"/>`}
      h+=gridLines(N,'rgba(0,0,0,.12)');
      // region borders
      for(let i=0;i<T;i++){const r=Math.floor(i/N),k=i%N;if(k<N-1&&reg[i]!==reg[i+1])h+=`<line x1="${(k+1)*S}" y1="${r*S}" x2="${(k+1)*S}" y2="${r*S+S}" stroke="#222" stroke-width="5"/>`;
        if(r<N-1&&reg[i]!==reg[i+N])h+=`<line x1="${k*S}" y1="${(r+1)*S}" x2="${k*S+S}" y2="${(r+1)*S}" stroke="#222" stroke-width="5"/>`}
      for(let i=0;i<T;i++){const x=cx(i),y=cy(i);
        if(st[i]===1)h+=popWrap(i,x,y,`<path d="M${x-14} ${y-14}L${x+14} ${y+14}M${x+14} ${y-14}L${x-14} ${y+14}" stroke="#555" stroke-width="6" stroke-linecap="round"/>`);
        if(st[i]===2){const col=c.bad.has(i)?'#e03131':solved?'#2b8a3e':'#111';h+=popWrap(i,x,y,`<g transform="translate(${x-30} ${y-28})"><path d="M4 46 L0 12 L16 26 L30 4 L44 26 L60 12 L56 46 Z" fill="${col}"/><rect x="4" y="50" width="52" height="7" rx="3" fill="${col}"/></g>`)}}
      if(opts.counts&&!solved){for(const l of L){if(l.kind!=='reg'||l.cells.some(i=>st[i]===2))continue;const open=l.cells.filter(i=>st[i]===0&&!attacked(i));
        const anchor=l.cells[0];h+=`<circle cx="${(anchor%N)*S+20}" cy="${Math.floor(anchor/N)*S+20}" r="15" fill="#fff" stroke="#222" stroke-width="2"/><text x="${(anchor%N)*S+20}" y="${Math.floor(anchor/N)*S+21}" font-size="19" font-weight="700" text-anchor="middle" dominant-baseline="central">${open.length}</text>`}}
      svg.innerHTML=h+highlights(N)+frame(N)},
    down(e){const c=cellAt(e,P.N);if(c<0||solved)return;down=c;dragMode=false;lastDrag=c},
    move(e){if(down===null||solved)return;const c=cellAt(e,P.N);if(c<0||c===lastDrag)return;
      if(!dragMode){dragMode=true;snap();if(st[down]===0){st[down]=1;Sound.play('soft')}}lastDrag=c;if(st[c]===0){st[c]=1;popCell=c;Sound.play('soft');moved();G.render()}},
    up(){if(down===null)return;if(!dragMode){snap();const v=st[down];setCell(down,v===0?1:v===1?2:0);if(v===2)st[down]=0;Sound.play(v===1?'select':'tap');moved()}down=null;G.render();check()}};
  return M;})();

