// Zip core: walls, random Hamiltonian path, solver and generator

function makeBoard(N){
  // walls stored as Set of "a|b" with a<b (cell indices)
  return {N, walls:new Set()};
}
function wkey(a,b){return a<b?a+'|'+b:b+'|'+a}
function neighbors(N,c){const r=(c/N)|0,k=c%N,o=[];if(r>0)o.push(c-N);if(r<N-1)o.push(c+N);if(k>0)o.push(c-1);if(k<N-1)o.push(c+1);return o}
function openNbrs(board,c){return neighbors(board.N,c).filter(n=>!board.walls.has(wkey(c,n)))}

// Random Hamiltonian path via backbite moves
function randomHamPath(N,rnd){
  let p=[];for(let r=0;r<N;r++)for(let k=0;k<N;k++)p.push(r*N+(r%2?N-1-k:k));
  const iters=N*N*N*12;
  for(let t=0;t<iters;t++){
    const atStart=rnd()<0.5;const end=atStart?p[0]:p[p.length-1];
    const nb=neighbors(N,end);const n=nb[(rnd()*nb.length)|0];
    const i=p.indexOf(n);
    if(atStart){ if(i===1)continue; p=p.slice(0,i).reverse().concat(p.slice(i)); }
    else { if(i===p.length-2)continue; p=p.slice(0,i+1).concat(p.slice(i+1).reverse()); }
  }
  return p;
}

// Solver: count solutions (up to limit) given board walls and clues {cell:number}
function solve(board,clues,limit=2,budget=400000){
  const N=board.N,T=N*N;
  const adj=[];for(let c=0;c<T;c++)adj.push(openNbrs(board,c));
  const clueAt=new Int32Array(T).fill(0);let maxNum=0,start=-1,endCell=-1;
  for(const [c,v] of Object.entries(clues)){clueAt[+c]=v;if(v>maxNum){maxNum=v;endCell=+c}if(v===1)start=+c}
  const vis=new Uint8Array(T);const path=[start];vis[start]=1;
  const sols=[];let nodes=0,aborted=false;
  const seen=new Int32Array(T);let stamp=0;const stack=new Int32Array(T);
  function feasible(head){
    // degree check + connectivity of unvisited cells from head
    stamp++;let sp=0;stack[sp++]=head;seen[head]=stamp;let reached=0;
    while(sp){const c=stack[--sp];for(const n of adj[c]){if(!vis[n]&&seen[n]!==stamp){seen[n]=stamp;reached++;stack[sp++]=n}}}
    if(reached!==T-path.length)return false;
    for(let c=0;c<T;c++){if(vis[c]||c===endCell)continue;let d=0;for(const n of adj[c]){if(!vis[n]||n===head)d++}if(d<2)return false}
    return true;
  }
  function dfs(head,next){
    if(aborted||sols.length>=limit)return;
    if(++nodes>budget){aborted=true;return}
    if(path.length===T){if(head===endCell)sols.push(path.slice());return}
    if(head===endCell)return;
    if(!feasible(head))return;
    // order: prefer neighbors with fewer onward options (Warnsdorff)
    const cand=[];
    for(const n of adj[head]){if(vis[n])continue;const v=clueAt[n];if(v&&v!==next)continue;
      let d=0;for(const m of adj[n])if(!vis[m])d++;cand.push([d,n])}
    cand.sort((a,b)=>a[0]-b[0]);
    for(const [,n] of cand){vis[n]=1;path.push(n);dfs(n,clueAt[n]?next+1:next);path.pop();vis[n]=0;if(aborted||sols.length>=limit)return}
  }
  dfs(start,2);
  return {sols,aborted,nodes};
}

function cluesFromIdx(path,idxSet){const s=[...idxSet].sort((a,b)=>a-b);const o={};s.forEach((i,j)=>o[path[i]]=j+1);return o}

const DIFF={
  normal:{clueFrac:0.22,wallFrac:0.14,floor:0.20},
  hard:{clueFrac:0.14,wallFrac:0.10,floor:0},
  expert:{clueFrac:0.10,wallFrac:0.04,floor:0}
};

function generate(N,diff,seed){
  const rnd=mulberry32(seed);const cfg=DIFF[diff];const T=N*N;
  const path=randomHamPath(N,rnd);const pos=new Int32Array(T);path.forEach((c,i)=>pos[c]=i);
  const board=makeBoard(N);
  // walls between adjacent cells not consecutive on the path
  const cand=[];for(let c=0;c<T;c++)for(const n of neighbors(N,c))if(c<n&&Math.abs(pos[c]-pos[n])!==1)cand.push([c,n]);
  for(let i=cand.length-1;i>0;i--){const j=(rnd()*(i+1))|0;[cand[i],cand[j]]=[cand[j],cand[i]]}
  const nW=Math.round(cand.length*cfg.wallFrac);for(let i=0;i<nW;i++)board.walls.add(wkey(...cand[i]));
  // initial clues: endpoints + evenly-ish spaced extras
  const idx=new Set([0,T-1]);const k=Math.max(2,Math.round(T*cfg.clueFrac));
  while(idx.size<k)idx.add(1+((rnd()*(T-2))|0));
  const budget=N<=7?300000:N<=8?200000:120000;
  let unique=false;
  for(let guard=0;guard<T;guard++){
    const r=solve(board,cluesFromIdx(path,idx),2,budget);
    if(!r.aborted&&r.sols.length===1){unique=true;break}
    let add;
    if(r.sols.length>=2){const alt=r.sols.find(s=>s.some((c,i)=>c!==path[i]))||r.sols[1];
      const diffIdx=[];for(let i=1;i<T-1;i++)if(alt[i]!==path[i]&&!idx.has(i))diffIdx.push(i);
      add=diffIdx.length?diffIdx[(rnd()*diffIdx.length)|0]:null}
    if(add==null){const free=[];for(let i=1;i<T-1;i++)if(!idx.has(i))free.push(i);if(!free.length)break;add=free[(rnd()*free.length)|0]}
    idx.add(add);
  }
  if(unique){
    const order=[...idx].filter(i=>i!==0&&i!==T-1);for(let i=order.length-1;i>0;i--){const j=(rnd()*(i+1))|0;[order[i],order[j]]=[order[j],order[i]]}
    const floor=Math.max(2,Math.round(T*cfg.floor));
    for(const i of order){if(idx.size<=floor)break;idx.delete(i);const r=solve(board,cluesFromIdx(path,idx),2,budget);if(r.aborted||r.sols.length!==1)idx.add(i)}
  }
  return {N,walls:[...board.walls],clues:cluesFromIdx(path,idx),solution:path,unique,seed,diff};
}

