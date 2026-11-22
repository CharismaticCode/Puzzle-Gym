// ===== Queens core =====
function qCount(N,reg,limit=2){
  const colU=new Uint8Array(N),regU=new Uint8Array(N);const cur=[];const sols=[];
  (function dfs(r,pc){if(sols.length>=limit)return;if(r===N){sols.push(cur.slice());return}
    for(let c=0;c<N;c++){if(colU[c]||regU[reg[r*N+c]]||(r>0&&Math.abs(c-pc)<=1))continue;
      colU[c]=1;regU[reg[r*N+c]]=1;cur.push(c);dfs(r+1,c);cur.pop();colU[c]=0;regU[reg[r*N+c]]=0}})(0,-9);
  return sols;
}
function qRandomSol(N,rnd){
  const cols=[];const used=new Uint8Array(N);
  function dfs(r){if(r===N)return true;for(const c of shuffle([...Array(N).keys()],rnd)){if(used[c]||(r>0&&Math.abs(c-cols[r-1])<=1))continue;used[c]=1;cols.push(c);if(dfs(r+1))return true;cols.pop();used[c]=0}return false}
  dfs(0);return cols;
}
function regionConnectedWithout(N,reg,c){
  const R=reg[c];const cells=[];for(let i=0;i<N*N;i++)if(reg[i]===R&&i!==c)cells.push(i);
  if(!cells.length)return false;const seen=new Set([cells[0]]);const st=[cells[0]];
  while(st.length){const x=st.pop();for(const n of nb4(N,x))if(n!==c&&reg[n]===R&&!seen.has(n)){seen.add(n);st.push(n)}}
  return seen.size===cells.length;
}
function qMakeRegions(N,sol,rnd){
  const reg=new Int32Array(N*N).fill(-1);const rate=[];
  for(let r=0;r<N;r++){reg[r*N+sol[r]]=r;rate.push(0.3+rnd()*1.7)}
  let left=N*N-N;
  while(left>0){
    // weighted pick region, expand into random unassigned neighbour
    let tot=rate.reduce((a,b)=>a+b,0),x=rnd()*tot,R=0;for(;R<N-1;R++){x-=rate[R];if(x<=0)break}
    const front=[];for(let i=0;i<N*N;i++)if(reg[i]===R)for(const n of nb4(N,i))if(reg[n]<0)front.push(n);
    if(!front.length){rate[R]=0.0001;continue}
    reg[front[(rnd()*front.length)|0]]=R;left--;
  }
  return reg;
}
// ---- human-style Queens logic (state: 0 unknown, 1 X, 2 Q) ----
function qLines(N,reg){
  const L=[];for(let r=0;r<N;r++){const a=[];for(let c=0;c<N;c++)a.push(r*N+c);L.push({kind:'row',id:r,cells:a})}
  for(let c=0;c<N;c++){const a=[];for(let r=0;r<N;r++)a.push(r*N+c);L.push({kind:'col',id:c,cells:a})}
  for(let g=0;g<N;g++){const a=[];for(let i=0;i<N*N;i++)if(reg[i]===g)a.push(i);L.push({kind:'reg',id:g,cells:a})}
  return L;
}
function qAttacks(N,reg,q){const out=[];const r=(q/N)|0,c=q%N;
  for(let i=0;i<N*N;i++){if(i===q)continue;const ri=(i/N)|0,ci=i%N;
    if(ri===r||ci===c||reg[i]===reg[q]||(Math.abs(ri-r)<=1&&Math.abs(ci-c)<=1))out.push(i)}return out}
// returns {type:'Q'|'X', cells:[], level, reason, focus:[]} or null
function qStep(N,reg,st,maxLevel=6,L){
  L=L||qLines(N,reg);
  const cand=l=>l.cells.filter(i=>st[i]===0);
  const hasQ=l=>l.cells.some(i=>st[i]===2);
  const name=l=>l.kind==='row'?'row '+(l.id+1):l.kind==='col'?'column '+(l.id+1):'the region';
  // L1 attacks of placed queens
  for(let q=0;q<N*N;q++)if(st[q]===2){const xs=qAttacks(N,reg,q).filter(i=>st[i]===0);
    if(xs.length)return{type:'X',cells:xs,level:1,focus:[q],reason:'A queen rules out its row, column, region and all eight cells around it.'}}
  // L2 singles
  for(const l of L){if(hasQ(l))continue;const c=cand(l);
    if(c.length===1)return{type:'Q',cells:c,level:2,focus:l.cells,reason:`Only one cell is left in ${name(l)}, so the queen goes there.`}}
  // L3 region confined to a line / line confined to a region
  for(const l of L){if(hasQ(l))continue;const c=cand(l);if(!c.length)continue;
    if(l.kind==='reg'){
      const rows=new Set(c.map(i=>(i/N)|0)),cols=new Set(c.map(i=>i%N));
      if(rows.size===1){const r=[...rows][0];const xs=[];for(let k=0;k<N;k++){const i=r*N+k;if(st[i]===0&&reg[i]!==l.id)xs.push(i)}
        if(xs.length)return{type:'X',cells:xs,level:3,focus:c,reason:`This region's queen must sit in row ${r+1}, so nothing else in that row can hold a queen.`}}
      if(cols.size===1){const k=[...cols][0];const xs=[];for(let r=0;r<N;r++){const i=r*N+k;if(st[i]===0&&reg[i]!==l.id)xs.push(i)}
        if(xs.length)return{type:'X',cells:xs,level:3,focus:c,reason:`This region's queen must sit in column ${k+1}, so nothing else in that column can hold a queen.`}}
    } else {
      const regs=new Set(c.map(i=>reg[i]));
      if(regs.size===1){const g=[...regs][0];const xs=[];for(let i=0;i<N*N;i++)if(reg[i]===g&&st[i]===0&&!l.cells.includes(i))xs.push(i);
        if(xs.length)return{type:'X',cells:xs,level:3,focus:c,reason:`All of ${name(l)}'s open cells are in one region, so that region's queen must be in this ${l.kind==='row'?'row':'column'}. Clear the rest of the region.`}}
    }}
  // L4 pigeonhole (k regions inside k rows/cols, k=2..4; also k rows inside k regions)
  const regsOpen=L.filter(l=>l.kind==='reg'&&!hasQ(l)&&cand(l).length);
  for(const axis of ['row','col']){
    const key=i=>axis==='row'?(i/N)|0:i%N;
    const spans=regsOpen.map(l=>({l,s:new Set(cand(l).map(key))})).filter(o=>o.s.size<=4);
    const k_max=Math.min(4,spans.length);
    for(let k=2;k<=k_max;k++){
      const AX=axis==='row'?'rows':'columns';const combo=(start,chosen,uni)=>{
        if(chosen.length===k){if(uni.size!==k)return null;const ids=new Set(chosen.map(o=>o.l.id));const xs=[];
          for(const v of uni)for(let t=0;t<N;t++){const i=axis==='row'?v*N+t:t*N+v;if(st[i]===0&&!ids.has(reg[i]))xs.push(i)}
          return xs.length?{type:'X',cells:xs,level:4,focus:chosen.flatMap(o=>cand(o.l)),reason:`${k} regions fit entirely inside the same ${k} ${AX}, so the queens for those ${AX} all belong to these regions. Clear everything else in those ${AX}.`}:null}
        for(let j=start;j<spans.length;j++){const u=new Set([...uni,...spans[j].s]);if(u.size>k)continue;const r=combo(j+1,[...chosen,spans[j]],u);if(r)return r}
        return null};
      const r=combo(0,[],new Set());if(r)return r;
    }
    // k lines inside k regions
    const linesOpen=L.filter(l=>l.kind===axis&&!hasQ(l)&&cand(l).length).map(l=>({l,s:new Set(cand(l).map(i=>reg[i]))})).filter(o=>o.s.size<=4);
    for(let k=2;k<=Math.min(4,linesOpen.length);k++){
      const AX=axis==='row'?'rows':'columns';const combo=(start,chosen,uni)=>{
        if(chosen.length===k){if(uni.size!==k)return null;const ln=new Set(chosen.map(o=>o.l.id));const xs=[];
          for(let i=0;i<N*N;i++)if(st[i]===0&&uni.has(reg[i])&&!ln.has(key(i)))xs.push(i);
          return xs.length?{type:'X',cells:xs,level:4,focus:chosen.flatMap(o=>cand(o.l)),reason:`${k} ${AX} only reach into the same ${k} regions, so those regions' queens are used up by these ${AX}. Clear the rest of those regions.`}:null}
        for(let j=start;j<linesOpen.length;j++){const u=new Set([...uni,...linesOpen[j].s]);if(u.size>k)continue;const r=combo(j+1,[...chosen,linesOpen[j]],u);if(r)return r}
        return null};
      const r=combo(0,[],new Set());if(r)return r;
    }
  }
  if(maxLevel<5)return null;
  // L5 one-step lookahead: queen here would empty some line
  for(let q=0;q<N*N;q++){if(st[q]!==0)continue;const att=new Set(qAttacks(N,reg,q));att.add(q);
    for(const l of L){if(hasQ(l)||l.cells.includes(q))continue;if(cand(l).every(i=>att.has(i)))
      return{type:'X',cells:[q],level:5,focus:cand(l),reason:`A queen here would knock out every open cell of ${name(l)} (highlighted), leaving it with no queen.`}}}
  if(maxLevel<6)return null;
  // L6 deeper: queen here leads to contradiction under levels 1-4
  for(let q=0;q<N*N;q++){if(st[q]!==0)continue;const s2=st.slice();s2[q]=2;
    if(qContradicts(N,reg,s2,L))return{type:'X',cells:[q],level:6,focus:[q],reason:'Imagine a queen here and follow the simple rules for a few steps: some row, column or region runs out of cells. So this cell is out.'}}
  return null;
}
function qBroken(N,reg,st,L){for(const l of L){const q=l.cells.filter(i=>st[i]===2).length;if(q>1)return true;if(q===0&&!l.cells.some(i=>st[i]===0))return true}
  for(let q=0;q<N*N;q++)if(st[q]===2)for(const a of qAttacks(N,reg,q))if(st[a]===2)return true;return false}
function qContradicts(N,reg,st,L){for(let it=0;it<200;it++){if(qBroken(N,reg,st,L))return true;const s=qStep(N,reg,st,4,L);if(!s)return false;for(const c of s.cells)st[c]=s.type==='Q'?2:1}return qBroken(N,reg,st,L)}
function qRate(N,reg){const L=qLines(N,reg);const st=new Uint8Array(N*N);let maxL=0,hard=0;
  for(let it=0;it<500;it++){const s=qStep(N,reg,st,6,L);if(!s)break;maxL=Math.max(maxL,s.level);if(s.level>=4)hard++;for(const c of s.cells)st[c]=s.type==='Q'?2:1}
  const solved=[...st].filter(v=>v===2).length===N;return{solved,maxL,hard}}
function genQueens(N,diff,seed){
  const rnd=mulberry32(seed);const want={normal:[1,3],hard:[4,5],expert:[6,6]}[diff];
  let best=null;
  for(let attempt=0;attempt<400;attempt++){
    const sol=qRandomSol(N,rnd);const reg=qMakeRegions(N,sol,rnd);let ok=false;
    for(let fix=0;fix<120;fix++){const s=qCount(N,reg,2);if(s.length===1){ok=true;break}
      const alt=s.find(a=>a.some((c,r)=>c!==sol[r]));const rows=[];alt.forEach((c,r)=>{if(c!==sol[r])rows.push(r)});
      let done=false;for(const r of shuffle(rows,rnd)){const c=r*N+alt[r];const opts=shuffle(nb4(N,c).map(n=>reg[n]).filter(g=>g!==reg[c]),rnd);
        if(opts.length&&regionConnectedWithout(N,reg,c)){reg[c]=opts[0];done=true;break}}
      if(!done)break}
    if(!ok)continue;
    const rt=qRate(N,reg);if(!rt.solved&&diff!=='expert')continue;
    const lvl=rt.solved?rt.maxL:7;
    const score=(lvl>=want[0]&&lvl<=want[1])?0:Math.min(Math.abs(lvl-want[0]),Math.abs(lvl-want[1]));
    if(!best||score<best.score||(score===0&&diff!=='normal'&&rt.hard>best.hard))best={score,hard:rt.hard,reg:[...reg],sol,lvl};
    if(score===0&&(diff==='normal'||attempt>15))break;
    if(attempt>(N>=9?60:150)&&best)break;
  }
  return{game:'queens',N,reg:best.reg,solution:best.sol.map((c,r)=>r*N+c),level:best.lvl,seed,diff};
}

