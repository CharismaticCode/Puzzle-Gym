// Zip: draw one path through every cell, hitting the numbers in order.
const Zip=(()=>{
  let path=[],visited,clueAt,endCell,maxNum,wallSet,dragging=false;
  const nextExpected=()=>{let n=1;for(const c of path)if(clueAt[c])n=clueAt[c]+1;return n};
  const board=()=>({N:P.N,walls:wallSet});
  function canStep(a,b){const N=P.N;if(Math.abs(((a/N)|0)-((b/N)|0))+Math.abs(a%N-b%N)!==1)return false;
    if(wallSet.has(wkey(a,b))||visited[b])return false;if(clueAt[b]&&clueAt[b]!==nextExpected())return false;if(path[path.length-1]===endCell)return false;return true}
  function analyse(){const N=P.N,T=N*N,head=path[path.length-1];const forced=[],stranded=[],island=[];
    for(let c=0;c<T;c++){if(visited[c])continue;const nb=openNbrs(board(),c).filter(n=>!visited[n]||(n===head&&head!==endCell));const need=c===endCell?1:2;
      if(nb.length<need)stranded.push(c);else if(nb.length===need&&c!==endCell)nb.forEach(n=>forced.push([c,n]))}
    const seen=new Uint8Array(T);const st=[head];seen[head]=1;while(st.length){const c=st.pop();for(const n of openNbrs(board(),c))if(!visited[n]&&!seen[n]){seen[n]=1;st.push(n)}}
    if(head!==endCell)for(let c=0;c<T;c++)if(!visited[c]&&!seen[c])island.push(c);
    const earlyEnd=head===endCell&&path.length<T;return{forced,stranded,island,earlyEnd,dead:stranded.length>0||island.length>0||earlyEnd}}
  function push(c){path.push(c);visited[c]=1;popCell=c;Sound.step(path.length/(P.N*P.N));moved();after()}
  function popTo(len,quiet){if(path.length<=Math.max(1,len))return;while(path.length>Math.max(1,len))visited[path.pop()]=0;if(!quiet)Sound.play('soft');queueSave();G.render();coach('')}
  function after(){G.render();const T=P.N*P.N;if(path.length===T&&path[T-1]===endCell){win();return}
    const a=analyse();if(opts.alarm&&a.dead){coach('⚠ '+(a.earlyEnd?'You reached the last number before filling every cell.':a.island.length?`That move cut off <b>${a.island.length}</b> cell${a.island.length>1?'s':''} from your path. You can't reach both sides now.`:'That move left a cell with only one way in, so the path can\'t pass through it.')+' Undo and look again.','bad')}else coach('')}
  const M={id:'zip',title:'Zip',sizes:[6,7,8,9,10],defSize:8,
    toggles:[{key:'alarm',label:'Dead-end alarm',def:true},{key:'forced',label:'Show forced moves',def:false},{key:'parity',label:'Checkerboard',def:false},{key:'gaps',label:'Clue gaps',def:false}],
    intro:'Start on <b>1</b>. Before you move, find the corners and pockets that are forced.',
    winTip:'Solved. A good habit: think back over the opening and name the forced cells you missed.',
    idle:()=>'Next number: <b>'+Math.min(nextExpected(),maxNum)+'</b>',
    describe:p=>Object.keys(p.clues).length+' numbers · '+p.walls.length+' walls',
    tips:`<ol><li><b>Corners and pockets first.</b> A cell with only two open sides must use both. Turn on <i>Show forced moves</i> to check what you spotted.</li><li><b>Never strand a cell.</b> Every empty cell needs two ways in (the last number needs one).</li><li><b>Don't split the board.</b> If your path cuts the empty cells into two islands, you can't reach both.</li><li><b>Parity.</b> Each step changes the checkerboard colour. If the gap between two numbers is an even number of steps, they're on opposite colours.</li><li><b>Clue gaps.</b> Numbers that sit close together on the board but far apart in order mean a long detour between them.</li><li><b>Work back from the last number.</b> It often has only one way in.</li></ol>`,
    getState:()=>path.slice(),
    setState(s){if(!Array.isArray(s)||!s.length)return;visited.fill(0);path=[];for(const c of s){path.push(c);visited[c]=1}},
    start(p){const T=p.N*p.N;clueAt=new Int32Array(T);maxNum=0;for(const [c,v] of Object.entries(p.clues)){clueAt[+c]=v;if(v>maxNum){maxNum=v;endCell=+c}}
      wallSet=new Set(p.walls);visited=new Uint8Array(T);const s=+Object.keys(p.clues).find(c=>p.clues[c]===1);path=[s];visited[s]=1},
    progress:()=>`${path.length}/${P.N*P.N} cells`,
    undo(){popTo(path.length-1)},reset(){const saved=path.slice();popTo(1);coach('Reset. Look for the forced cells first.');if(saved.length>1)toast('Path cleared',{label:'Undo',run:()=>{M.setState(saved);queueSave();G.render()}})},canUndo:()=>path.length>1,
    hint(){const sol=P.solution;let k=0;while(k<path.length&&path[k]===sol[k])k++;
      if(k<path.length){hints++;coach(`Wrong turn at step <b>${k+1}</b>. Everything after it is off the solution. <button id="rw">Rewind there</button>`,'bad');$('rw').onclick=()=>{popTo(k);flash([sol[k-1]]);coach('Rewound. The highlighted cell is your last correct one.')};flash([path[k]]);return}
      const nxt=sol[path.length];hints++;const head=path[path.length-1];
      const cands=openNbrs(board(),head).filter(n=>canStep(head,n));
      const viable=cands.filter(n=>{path.push(n);visited[n]=1;const a=analyse();path.pop();visited[n]=0;return!a.dead});
      const nb=openNbrs(board(),nxt).filter(n=>!visited[n]||n===head);let why;
      if(cands.length===1)why='It is the only open move.';else if(viable.length===1)why='Every other move strands a cell or splits the board. Check each one to see why.';
      else if(nb.length===2&&nxt!==endCell)why='That cell has only two ways in, so the path has to go through it now.';else if(clueAt[nxt])why=`It is number <b>${clueAt[nxt]}</b>, the next one you need.`;
      else why=`This is a deeper one: ${viable.length} moves look safe for now, but only this one works later. Count the cells between here and number <b>${nextExpected()}</b>.`;
      path.push(nxt);visited[nxt]=1;popCell=nxt;moved();flash([nxt]);G.render();
      if(path.length===P.N*P.N){win();return}coach('Hint: next cell highlighted. '+why)},
    render(){const N=P.N,T=N*N,W=N*S;const svg=$('board');svg.setAttribute('viewBox',`-6 -6 ${W+12} ${W+12}`);
      const a=!solved?analyse():null;let h=`<rect x="0" y="0" width="${W}" height="${W}" fill="#fff"/>`;
      for(let c=0;c<T;c++){const dark=((c%N)+Math.floor(c/N))%2;let f=visited[c]?'#fff1e2':(opts.parity&&dark?'#ecebe6':'#fff');
        if(a&&opts.alarm&&(a.stranded.includes(c)||a.island.includes(c)))f='#ffe0ea';h+=`<rect x="${(c%N)*S}" y="${Math.floor(c/N)*S}" width="${S}" height="${S}" fill="${cellFill(c,f)}"/>`}
      h+=gridLines(N);
      if(opts.gaps){const by=[];for(let c=0;c<T;c++)if(clueAt[c])by[clueAt[c]]=c;for(let n=1;n<maxNum;n++)h+=`<line x1="${cx(by[n])}" y1="${cy(by[n])}" x2="${cx(by[n+1])}" y2="${cy(by[n+1])}" stroke="#7048e8" stroke-width="4" stroke-dasharray="10 8" opacity=".45"/>`}
      if(a&&opts.forced){const d=new Set();for(const [p,q] of a.forced){const k=wkey(p,q);if(d.has(k))continue;d.add(k);h+=`<line x1="${cx(p)}" y1="${cy(p)}" x2="${cx(q)}" y2="${cy(q)}" stroke="#1971c2" stroke-width="10" stroke-linecap="round" opacity=".35"/>`}}
      if(path.length>1)h+=`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8590c"/><stop offset="1" stop-color="#f59f00"/></linearGradient></defs><polyline points="${path.map(c=>cx(c)+','+cy(c)).join(' ')}" fill="none" stroke="${solved?'#2b8a3e':'url(#g)'}" stroke-width="${S*.42}" stroke-linecap="round" stroke-linejoin="round"/>`;
      for(const k of P.walls){const [p,q]=k.split('|').map(Number);const pr=Math.floor(p/N),pc=p%N,qr=Math.floor(q/N),qc=q%N;
        if(pr===qr){const x=Math.max(pc,qc)*S;h+=`<line x1="${x}" y1="${pr*S}" x2="${x}" y2="${pr*S+S}" stroke="#111" stroke-width="14"/>`}else{const y=Math.max(pr,qr)*S;h+=`<line x1="${pc*S}" y1="${y}" x2="${pc*S+S}" y2="${y}" stroke="#111" stroke-width="14"/>`}}
      const nn=nextExpected();for(let c=0;c<T;c++)if(clueAt[c]){const v=clueAt[c];h+=`<circle cx="${cx(c)}" cy="${cy(c)}" r="${S*.36}" fill="#111"/>`;
        if(v===nn&&!solved)h+=`<circle cx="${cx(c)}" cy="${cy(c)}" r="${S*.42}" fill="none" stroke="#e8590c" stroke-width="5"/>`;
        h+=`<text x="${cx(c)}" y="${cy(c)}" fill="#fff" font-size="${v>9?36:42}" font-weight="700" text-anchor="middle" dominant-baseline="central">${v}</text>`}
      if(!solved){const hd=path[path.length-1];if(!clueAt[hd])h+=`<circle class="head" cx="${cx(hd)}" cy="${cy(hd)}" r="${S*.14}" fill="#fff"/>`}
      svg.innerHTML=h+highlights(N)+frame(N)},
    down(e){dragging=true;const c=cellAt(e,P.N);if(c<0||solved)return;const head=path[path.length-1];if(c===head)return;const i=path.indexOf(c);if(i>=0){popTo(i+1);return}if(canStep(head,c))push(c)},
    move(e){if(!dragging||solved)return;const c=cellAt(e,P.N);if(c<0)return;const head=path[path.length-1];if(path.length>1&&c===path[path.length-2]){popTo(path.length-1);return}if(c!==head&&canStep(head,c))push(c)},
    up(){dragging=false},
    key(k){const N=P.N,hd=path[path.length-1];const d={ArrowUp:-N,ArrowDown:N,ArrowLeft:-1,ArrowRight:1}[k];if(d===undefined)return false;
      const n=hd+d;if((d===1||d===-1)&&Math.floor(n/N)!==Math.floor(hd/N))return true;if(n<0||n>=N*N)return true;
      if(path.length>1&&n===path[path.length-2])popTo(path.length-1);else if(canStep(hd,n))push(n);return true}};
  return M;})();

