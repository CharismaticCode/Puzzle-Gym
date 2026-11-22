// ===== Tango (sun/moon) core =====
// cells: -1 empty, 0 sun, 1 moon. edges: [a,b,'='|'x']
function tLinesOf(N){const L=[];for(let r=0;r<N;r++){const a=[];for(let c=0;c<N;c++)a.push(r*N+c);L.push(a)}for(let c=0;c<N;c++){const a=[];for(let r=0;r<N;r++)a.push(r*N+c);L.push(a)}return L}
function tValidPartial(N,g,edges){const L=tLinesOf(N);const h=N/2;
  for(const l of L){let z=0,o=0;for(let i=0;i<N;i++){const v=g[l[i]];if(v===0)z++;else if(v===1)o++;
    if(i>=2&&v>=0&&g[l[i-1]]===v&&g[l[i-2]]===v)return false}if(z>h||o>h)return false}
  for(const [a,b,t] of edges){if(g[a]<0||g[b]<0)continue;if((t==='=')!==(g[a]===g[b]))return false}return true}
function tRandomFull(N,rnd){const g=new Int8Array(N*N).fill(-1);
  function ok(i){const r=(i/N)|0,c=i%N,v=g[i],h=N/2;
    if(c>=2&&g[i-1]===v&&g[i-2]===v)return false;if(r>=2&&g[i-N]===v&&g[i-2*N]===v)return false;
    let a=0,b=0;for(let k=0;k<=c;k++)if(g[r*N+k]===v)a++;for(let k=0;k<=r;k++)if(g[k*N+c]===v)b++;return a<=h&&b<=h}
  (function dfs(i){if(i===N*N)return true;for(const v of rnd()<.5?[0,1]:[1,0]){g[i]=v;if(ok(i)&&dfs(i+1))return true}g[i]=-1;return false})(0);return g}
// propagation step (human-style), returns {cells:[...], val, level, reason, focus} or null
function tStep(N,g,edges,maxLevel=5,L){
  L=L||tLinesOf(N);const h=N/2;const S=v=>v===0?'sun':'moon';
  for(const l of L)for(let i=0;i+1<N;i++){const a=l[i],b=l[i+1];if(g[a]>=0&&g[a]===g[b]){
    for(const e of [i-1,i+2])if(e>=0&&e<N&&g[l[e]]<0)return{cells:[l[e]],val:1-g[a],level:1,focus:[a,b],reason:`Two ${S(g[a])}s side by side: a third ${S(g[a])} would make three in a row, so this end is a ${S(1-g[a])}.`}}}
  for(const l of L)for(let i=0;i+2<N;i++){const a=l[i],m=l[i+1],b=l[i+2];if(g[a]>=0&&g[a]===g[b]&&g[m]<0)
    return{cells:[m],val:1-g[a],level:1,focus:[a,b],reason:`A gap between two ${S(g[a])}s must be a ${S(1-g[a])}, or there would be three in a row.`}}
  for(const [a,b,t] of edges){const k=g[a]>=0?a:g[b]>=0?b:-1;const u=k===a?b:a;if(k<0||g[u]>=0)continue;
    const v=t==='='?g[k]:1-g[k];return{cells:[u],val:v,level:1,focus:[k],reason:t==='='?`An = sign means both cells match, so this is a ${S(v)}.`:`A × sign means the cells are opposite, so this is a ${S(v)}.`}}
  for(const l of L){let z=0,o=0;const e=[];for(const i of l){if(g[i]===0)z++;else if(g[i]===1)o++;else e.push(i)}
    if(e.length&&(z===h||o===h)){const v=z===h?1:0;return{cells:e,val:v,level:2,focus:l,reason:`This line already has its ${h} ${S(1-v)}s, so every empty cell in it is a ${S(v)}.`}}}
  if(maxLevel<3)return null;
  // L3: pair-edge logic inside a line: an '='/'x' pair of empties with counts
  for(const l of L){let z=0,o=0;const e=[];for(const i of l){if(g[i]===0)z++;else if(g[i]===1)o++;else e.push(i)}
    for(const [a,b,t] of edges){if(t!=='x'||g[a]>=0||g[b]>=0||!l.includes(a)||!l.includes(b))continue;
      // x pair takes one of each; remaining empties
      const rest=e.filter(i=>i!==a&&i!==b);const z2=z+1,o2=o+1;
      if(rest.length&&(z2===h||o2===h)){const v=z2===h?1:0;return{cells:rest,val:v,level:3,focus:[a,b],reason:`The × pair must hold one sun and one moon. Count those in, and the line's ${S(1-v)}s are used up, so the other empty cells are ${S(v)}s.`}}}}
  if(maxLevel<4)return null;
  // L4: lookahead — try a value, propagate L1-3, contradiction => opposite
  for(let i=0;i<N*N;i++){if(g[i]>=0)continue;for(const v of [0,1]){const g2=g.slice();g2[i]=v;
    if(tContradicts(N,g2,edges,L))return{cells:[i],val:1-v,level:4,focus:[i],reason:`Try a ${S(v)} here and follow the simple rules for a few steps: a line breaks. So it has to be a ${S(1-v)}.`}}}
  return null;
}
function tContradicts(N,g,edges,L){for(let it=0;it<N*N;it++){if(!tValidPartial(N,g,edges))return true;const s=tStep(N,g,edges,3,L);if(!s)break;for(const c of s.cells)g[c]=s.val}return !tValidPartial(N,g,edges)}
function tCount(N,g0,edges,limit=2){const g=g0.slice();const sols=[];const L=tLinesOf(N);
  (function dfs(){if(sols.length>=limit)return;
    // propagate cheaply
    const saved=g.slice();
    for(let it=0;it<N*N;it++){if(!tValidPartial(N,g,edges)){g.set(saved);return}const s=tStep(N,g,edges,2,L);if(!s)break;for(const c of s.cells)g[c]=s.val}
    if(!tValidPartial(N,g,edges)){g.set(saved);return}
    const i=g.indexOf(-1);if(i<0){sols.push(g.slice());g.set(saved);return}
    for(const v of [0,1]){g[i]=v;dfs();g[i]=-1;if(sols.length>=limit)break}
    g.set(saved)})();
  return sols}
function tRate(N,g0,edges){const g=g0.slice();const L=tLinesOf(N);let maxL=0,hard=0;
  for(let it=0;it<N*N*2;it++){const s=tStep(N,g,edges,4,L);if(!s)break;maxL=Math.max(maxL,s.level);if(s.level>=3)hard++;for(const c of s.cells)g[c]=s.val}
  return{solved:g.indexOf(-1)<0,maxL,hard}}
function genTango(N,diff,seed){
  const rnd=mulberry32(seed);const want={normal:[1,2],hard:[3,4],expert:[4,4]}[diff];let best=null;
  for(let attempt=0;attempt<60;attempt++){
    const sol=tRandomFull(N,rnd);const T=N*N;
    // candidate edges
    const all=[];for(let i=0;i<T;i++){if(i%N<N-1)all.push([i,i+1]);if(i+N<T)all.push([i,i+N])}
    shuffle(all,rnd);const nE=Math.round(N*({normal:1.3,hard:1.0,expert:0.7}[diff]));
    let edges=all.slice(0,nE).map(([a,b])=>[a,b,sol[a]===sol[b]?'=':'x']);
    const g=Int8Array.from(sol);
    for(const i of shuffle([...Array(T).keys()],rnd)){const v=g[i];g[i]=-1;
      const ok=diff==='normal'?tRate(N,g,edges).solved&&tRate(N,g,edges).maxL<=2:tCount(N,g,edges,2).length===1;if(!ok)g[i]=v}
    if(diff!=='normal'){for(const e of shuffle(edges.slice(),rnd)){const ed=edges.filter(x=>x!==e);if(tCount(N,g,ed,2).length===1)edges=ed}}
    const rt=tRate(N,g,edges);if(!rt.solved)continue;
    const score=(rt.maxL>=want[0]&&rt.maxL<=want[1])?0:Math.min(Math.abs(rt.maxL-want[0]),Math.abs(rt.maxL-want[1]));
    if(!best||score<best.score||(score===0&&rt.hard>best.hard))best={score,hard:rt.hard,g:[...g],edges,sol:[...sol],lvl:rt.maxL};
    if(score===0&&(diff==='normal'||attempt>(N>=10?0:4)))break;
    if(attempt>(N>=10?4:20)&&best)break;
  }
  return{game:'tango',N,givens:best.g,edges:best.edges,solution:best.sol,level:best.lvl,seed,diff};
}
