// Sun & Moon: balanced rows and columns, never three in a row, = and × signs.
const Tango=(()=>{
  let g,hist,given,L;
  const snap=()=>{hist.push(g.slice());if(hist.length>300)hist.shift()};
  function violations(){const N=P.N,h=N/2,bad=new Set(),badLines=[],badEdges=[];
    for(const l of L){let z=0,o=0;for(let i=0;i<N;i++){const v=g[l[i]];if(v===0)z++;else if(v===1)o++;if(i>=2&&v>=0&&g[l[i-1]]===v&&g[l[i-2]]===v){bad.add(l[i]);bad.add(l[i-1]);bad.add(l[i-2])}}
      if(z>h||o>h)badLines.push(l)}
    for(const e of P.edges){const [a,b,t]=e;if(g[a]>=0&&g[b]>=0&&((t==='=')!==(g[a]===g[b])))badEdges.push(e)}
    return{bad,badLines,badEdges,any:bad.size||badLines.length||badEdges.length}}
  function check(){if(g.indexOf(-1)<0&&!violations().any){win();return}
    if(opts.alarm){const v=violations();if(v.bad.size){coach('⚠ Three of the same in a row. The cells are in red.','bad');return}
      if(v.badLines.length){coach(`⚠ A line has more than ${P.N/2} of one symbol.`,'bad');return}if(v.badEdges.length){coach('⚠ A cell doesn\'t match its = or × sign.','bad');return}}coach('')}
  function sun(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><circle r="22" fill="#f59f00" stroke="#e8590c" stroke-width="4"/></g>`}
  function moon(x,y,s=1){return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M8 -24 A24 24 0 1 0 22 10 A18 18 0 1 1 8 -24 Z" fill="#4dabf7" stroke="#1971c2" stroke-width="4" stroke-linejoin="round"/></g>`}
  const M={id:'tango',title:'Sun & Moon',sizes:[6,8,10],defSize:6,
    toggles:[{key:'alarm',label:'Mistake alarm',def:true},{key:'counts',label:'Line counts',def:false}],
    intro:'Fill every cell with a sun or a moon. Each row and column has equal numbers of each, and you can\'t have three of the same in a row. = means two cells match, × means they\'re opposite. Tap to cycle.',
    winTip:'Solved. Look back: where did you first need a count or a "what if" step rather than the pair rules?',
    idle:()=>{const n=g.filter(v=>v<0).length;return n+' cells to go'},
    describe:p=>p.givens.filter(v=>v>=0).length+' given · '+p.edges.length+' signs · logic level '+p.level,
    tips:`<ol><li><b>Pairs.</b> Two of the same side by side? Both ends must be the other symbol.</li><li><b>Gaps.</b> If a cell sits between two of the same symbol, it must be the other one.</li><li><b>Signs carry values.</b> Fill one end of an = or × and the other end follows. Chains of signs pass a value a long way.</li><li><b>Count.</b> Once a line has ${'half'} its cells as one symbol, the rest are the other. <i>Line counts</i> shows the tally for each line.</li><li><b>× pairs count as one of each.</b> An empty × pair in a line uses one sun and one moon. That often finishes the count.</li><li><b>"What if" test.</b> Put a symbol in a cell, follow the simple rules for a few steps, and see if a line breaks. If it does, the cell is the other symbol.</li></ol>`,
    getState:()=>Array.from(g),
    setState(s){if(s&&s.length===g.length)g=Int8Array.from(s)},
    start(p){g=Int8Array.from(p.givens);given=p.givens.map(v=>v>=0);hist=[];L=tLinesOf(p.N)},
    progress:()=>g.filter(v=>v>=0).length+'/'+P.N*P.N+' cells',
    canUndo:()=>hist.length>0,
    undo(){if(hist.length){g=hist.pop();Sound.play('soft');queueSave();G.render();check()}},
    reset(){snap();for(let i=0;i<g.length;i++)if(!given[i])g[i]=-1;queueSave();G.render();coach('Cleared. Start with the pairs and the signs.');toast('Board cleared',{label:'Undo',run:()=>M.undo()})},
    hint(){const N=P.N;hints++;const wrong=[];for(let i=0;i<N*N;i++)if(g[i]>=0&&g[i]!==P.solution[i])wrong.push(i);
      if(wrong.length){coach(`This cell is wrong${wrong.length>1?` (and ${wrong.length-1} more)`:''}. <button id="fx">Clear wrong cells</button>`,'bad');$('fx').onclick=()=>{snap();wrong.forEach(i=>g[i]=-1);G.render();coach('Cleared the wrong cells.')};flash([wrong[0]]);return}
      const s=tStep(N,g.slice(),P.edges,4,L);snap();
      if(!s){const i=g.indexOf(-1);g[i]=P.solution[i];flash([i]);coach('No simple step left, so I\'ve filled one cell for you.');G.render();check();return}
      for(const c of s.cells)g[c]=s.val;popCell=s.cells[0];moved();flash(s.cells,s.focus);
      coach(`Hint (${['','basic','count','× pair','what-if'][s.level]}): ${s.reason}`);G.render();if(g.indexOf(-1)<0&&!violations().any)win()},
    render(){const N=P.N,T=N*N,W=N*S;const pad=opts.counts?64:6;const svg=$('board');svg.setAttribute('viewBox',`-6 -6 ${W+6+pad} ${W+6+pad}`);
      const v=!solved&&opts.alarm?violations():{bad:new Set(),badLines:[],badEdges:[]};const badL=new Set(v.badLines.flat());let h='';
      for(let i=0;i<T;i++)h+=`<rect x="${(i%N)*S}" y="${Math.floor(i/N)*S}" width="${S}" height="${S}" fill="${cellFill(i,v.bad.has(i)?'#ffc9c9':badL.has(i)?'#fff0f0':given[i]?'#eeece6':'#fff')}"/>`;
      h+=gridLines(N);
      for(let i=0;i<T;i++){if(g[i]<0)continue;const x=cx(i),y=cy(i);h+=popWrap(i,x,y,g[i]===0?sun(x,y,1.25):moon(x,y,1.25))}
      for(const e of P.edges){const [a,b,t]=e;const x=(cx(a)+cx(b))/2,y=(cy(a)+cy(b))/2;const isBad=v.badEdges.includes(e);
        h+=`<circle cx="${x}" cy="${y}" r="15" fill="${isBad?'#ffc9c9':'#fff'}" stroke="#999" stroke-width="2"/><text x="${x}" y="${y+1}" font-size="${t==='='?26:24}" font-weight="700" fill="#495057" text-anchor="middle" dominant-baseline="central">${t==='='?'=':'×'}</text>`}
      if(opts.counts){for(let r=0;r<N;r++){let z=0,o=0;for(let k=0;k<N;k++){const val=g[r*N+k];if(val===0)z++;if(val===1)o++}
          h+=`<text x="${W+10}" y="${r*S+38}" font-size="22" fill="${z>N/2?'#e03131':'#e8590c'}" font-weight="700">${z}☀</text><text x="${W+10}" y="${r*S+72}" font-size="22" fill="${o>N/2?'#e03131':'#1971c2'}" font-weight="700">${o}☾</text>`}
        for(let k=0;k<N;k++){let z=0,o=0;for(let r=0;r<N;r++){const val=g[r*N+k];if(val===0)z++;if(val===1)o++}
          h+=`<text x="${k*S+50}" y="${W+28}" font-size="22" text-anchor="middle" fill="${z>N/2?'#e03131':'#e8590c'}" font-weight="700">${z}☀</text><text x="${k*S+50}" y="${W+54}" font-size="22" text-anchor="middle" fill="${o>N/2?'#e03131':'#1971c2'}" font-weight="700">${o}☾</text>`}}
      svg.innerHTML=h+highlights(N)+frame(N)},
    down(e){const c=cellAt(e,P.N);if(c<0||solved)return;if(given[c]){Sound.play('thud');return}snap();g[c]=g[c]===-1?0:g[c]===0?1:-1;popCell=c;Sound.play(g[c]===-1?'soft':'tap');moved();G.render();check()},
    move(){},up(){}};
  return M;})();

