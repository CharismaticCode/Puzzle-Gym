// Dispatch (original): meet hourly demand and each plant's daily energy, with ramp limits.
const Dispatch=(()=>{
  const PLANTS=['Kariba','Kafue','Itezhi','Maamba','Ndola','Lunsem','KGL'];
  let g,given,hist;
  const snap=()=>{hist.push(g.slice());if(hist.length>300)hist.shift()};
  const hour=r=>String(6+r*2).padStart(2,'0')+':00';
  const PP=()=>({rowSum:P.rowSum,colSum:P.colSum});
  function sums(){const N=P.N,rs=[],cs=[],rf=[],cf=[];for(let r=0;r<N;r++){let s=0,f=true;for(let c=0;c<N;c++){const v=g[r*N+c];if(v>=0)s+=v;else f=false}rs.push(s);rf.push(f)}
    for(let c=0;c<N;c++){let s=0,f=true;for(let r=0;r<N;r++){const v=g[r*N+c];if(v>=0)s+=v;else f=false}cs.push(s);cf.push(f)}return{rs,cs,rf,cf}}
  function issues(){const N=P.N,ramps=[];for(let i=0;i+N<N*N;i++)if(g[i]>=0&&g[i+N]>=0&&Math.abs(g[i]-g[i+N])>1)ramps.push(i);
    const s=sums();const badR=[],badC=[];for(let r=0;r<N;r++)if(s.rs[r]>P.rowSum[r]||(s.rf[r]&&s.rs[r]!==P.rowSum[r]))badR.push(r);
    for(let c=0;c<N;c++)if(s.cs[c]>P.colSum[c]||(s.cf[c]&&s.cs[c]!==P.colSum[c]))badC.push(c);return{ramps,badR,badC,s,any:ramps.length||badR.length||badC.length}}
  function check(){if(g.indexOf(-1)<0&&!issues().any){win();return}
    if(opts.alarm){const v=issues();if(v.ramps.length){coach('⚠ Ramp breach: a plant jumped more than one step between hours (marked in red).','bad');return}
      if(v.badR.length){coach(`⚠ Hour ${hour(v.badR[0])} doesn't match its demand of ${P.rowSum[v.badR[0]]}.`,'bad');return}
      if(v.badC.length){coach(`⚠ ${PLANTS[v.badC[0]]} doesn't match its daily energy of ${P.colSum[v.badC[0]]}.`,'bad');return}}coach('')}
  const M={id:'dispatch',title:'Dispatch',sizes:[5,6,7],defSize:6,
    toggles:[{key:'alarm',label:'Breach alarm',def:true},{key:'live',label:'Live totals',def:true},{key:'cands',label:'Show candidates',def:false}],
    intro:'You\'re the control room. Set each plant\'s output (0–3 blocks) for every hour. Each hour must meet its <b>demand</b> exactly, each plant must hit its <b>daily energy</b>, and no plant can ramp more than <b>one step</b> between hours. Tap a cell to cycle through the values.',
    winTip:'Balanced. Look back: which hour or plant had the least room to move? That is where the solve started.',
    idle:()=>g.filter(v=>v<0).length+' slots left to dispatch',
    describe:p=>p.givens.filter(v=>v>=0).length+' fixed · logic level '+p.level,
    tips:`<ol><li><b>Tight lines first.</b> An hour with very high or very low demand leaves little choice. If demand equals 3 × plants, everything runs flat out. If it is 0, everything is off.</li><li><b>Headroom.</b> For any cell, work out the most and least the other plants in that hour could give. The cell has to make up the rest. Do the same down each plant's day.</li><li><b>Ramps spread information.</b> A fixed 3 means the hours either side are at least 2. A 0 means they're at most 1. Two hours apart, the gap can be at most 2.</li><li><b>Zero-energy plants.</b> A plant with a daily total of 0 is on outage, so its whole column is 0. A low total next to a high ramp floor is just as strong.</li><li><b>Candidates.</b> Turn on <i>Show candidates</i> to see which values the ramp limits still allow in each slot. Headroom is left for you to work out. Then try to work them out with it off.</li><li><b>"What if".</b> On Hard and Expert, try a value, follow it for a few steps and see if an hour or a plant breaks.</li></ol>`,
    getState:()=>Array.from(g),
    setState(s){if(s&&s.length===g.length)g=Int8Array.from(s)},
    start(p){g=Int8Array.from(p.givens);given=p.givens.map(v=>v>=0);hist=[]},
    progress:()=>g.filter(v=>v>=0).length+'/'+P.N*P.N+' slots',
    canUndo:()=>hist.length>0,
    undo(){if(hist.length){g=hist.pop();Sound.play('soft');queueSave();G.render();check()}},
    reset(){snap();for(let i=0;i<g.length;i++)if(!given[i])g[i]=-1;queueSave();G.render();coach('Cleared. Start with the tightest hour or plant.');return()=>M.undo()},
    hint(){const N=P.N;hints++;const wrong=[];for(let i=0;i<N*N;i++)if(g[i]>=0&&g[i]!==P.solution[i])wrong.push(i);
      if(wrong.length){coach(`This slot is wrong${wrong.length>1?` (and ${wrong.length-1} more)`:''}. <button id="fx">Clear wrong slots</button>`,'bad');$('fx').onclick=()=>{snap();wrong.forEach(i=>g[i]=-1);G.render();coach('Cleared.')};flash([wrong[0]]);return}
      const h=dHint(N,PP(),Array.from(g));snap();
      if(!h){const i=g.indexOf(-1);g[i]=P.solution[i];flash([i]);coach('No simple step left, so I\'ve filled one slot for you.');G.render();check();return}
      const r=(h.cell/N)|0,c=h.cell%N;let why,focus=[];
      if(h.level===2){const l=h.info.line;focus=l.cells.filter(x=>x!==h.cell);
        why=l.kind==='row'?`Hour ${hour(r)} needs <b>${h.info.t}</b>. The other plants can give between ${h.info.omin} and ${h.info.omax}, which leaves only <b>${h.val}</b> for ${PLANTS[c]}.`
          :`${PLANTS[c]} must produce <b>${h.info.t}</b> over the day. Its other hours add up to between ${h.info.omin} and ${h.info.omax}, which leaves only <b>${h.val}</b> at ${hour(r)}.`}
      else if(h.level===1){focus=[h.cell-N,h.cell+N].filter(x=>x>=0&&x<N*N);why=`Ramp limit: ${PLANTS[c]} can only move one step per hour, and the hours either side pin it to <b>${h.val}</b>.`}
      else why=`What if: any other value here breaks an hour's demand or a ramp a few steps later, so it must be <b>${h.val}</b>.`;
      g[h.cell]=h.val;popCell=h.cell;moved();flash([h.cell],focus);coach(`Hint (${['','ramp','headroom','what-if'][h.level]}): ${why}`);G.render();check()},
    render(){const N=P.N,T=N*N,W=N*S;const svg=$('board');const L=78,TOP=44,R=opts.live?116:84,B=opts.live?70:46;
      svg.setAttribute('viewBox',`${-L} ${-TOP} ${W+L+R} ${W+TOP+B}`);
      const v=!solved&&opts.alarm?issues():{ramps:[],badR:[],badC:[],s:sums()};const s=v.s||sums();
      let cand=null;if(opts.cands&&!solved){const c=dInit(N,PP(),Array.from(g));if(dProp(N,PP(),c,1,null))cand=c}
      let h=`<rect x="${-L}" y="${-TOP}" width="${W+L+R}" height="${W+TOP+B}" fill="#fff"/>`;
      for(let i=0;i<T;i++){const x=(i%N)*S,y=Math.floor(i/N)*S;h+=`<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="${given[i]?'#eeece6':'#fff'}"/>`;
        if(g[i]>=0){const bh=g[i]/DK*(S-24);if(g[i]>0)h+=`<rect x="${x+14}" y="${y+S-10-bh}" width="${S-28}" height="${bh}" rx="6" fill="${solved?'#8ce99a':given[i]?'#adb5bd':'#ffa94d'}"/>`;
          h+=popWrap(i,x+S/2,y+S/2,`<text x="${x+S/2}" y="${y+S/2}" font-size="40" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="#111">${g[i]}</text>`)}
        else if(cand){const b=bits(cand[i]);h+=`<text x="${x+S/2}" y="${y+S/2}" font-size="22" fill="#1971c2" text-anchor="middle" dominant-baseline="central">${b.join(' ')}</text>`}}
      h+=gridLines(N);
      for(const i of v.ramps)h+=`<line x1="${cx(i)}" y1="${cy(i)+18}" x2="${cx(i)}" y2="${cy(i+N)-18}" stroke="#e03131" stroke-width="8" stroke-linecap="round"/>`;
      for(let c=0;c<N;c++)h+=`<text x="${c*S+S/2}" y="-14" font-size="${N>6?17:19}" font-weight="700" text-anchor="middle" fill="#495057">${PLANTS[c]}</text>`;
      for(let r=0;r<N;r++){h+=`<text x="-10" y="${r*S+S/2}" font-size="20" text-anchor="end" dominant-baseline="central" fill="#868e96">${hour(r)}</text>`;
        const bad=v.badR.includes(r),ok=s.rf[r]&&s.rs[r]===P.rowSum[r];
        h+=`<text x="${W+12}" y="${r*S+(opts.live?40:S/2)}" font-size="26" font-weight="800" dominant-baseline="central" fill="${bad?'#e03131':ok?'#2b8a3e':'#111'}">⚡${P.rowSum[r]}</text>`;
        if(opts.live)h+=`<text x="${W+14}" y="${r*S+72}" font-size="19" dominant-baseline="central" fill="#868e96">has ${s.rs[r]}</text>`}
      for(let c=0;c<N;c++){const bad=v.badC.includes(c),ok=s.cf[c]&&s.cs[c]===P.colSum[c];
        h+=`<text x="${c*S+S/2}" y="${W+30}" font-size="26" font-weight="800" text-anchor="middle" fill="${bad?'#e03131':ok?'#2b8a3e':'#111'}">Σ${P.colSum[c]}</text>`;
        if(opts.live)h+=`<text x="${c*S+S/2}" y="${W+58}" font-size="19" text-anchor="middle" fill="#868e96">has ${s.cs[c]}</text>`}
      svg.innerHTML=h+highlights(N)+frame(N)},
    down(e){const c=cellAt(e,P.N);if(c<0||solved)return;if(given[c]){Sound.play('thud');return}snap();g[c]=g[c]===-1?0:g[c]===DK?-1:g[c]+1;popCell=c;Sound.play(g[c]===-1?'soft':'tap');moved();G.render();check()},
    move(){},up(){}};
  return M;})();

