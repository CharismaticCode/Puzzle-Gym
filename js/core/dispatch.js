// ===== Dispatch core (unit commitment logic puzzle) =====
// N hours (rows) x N plants (cols); each cell 0..3 MW blocks.
// Row target = hourly demand, column target = plant's energy for the day.
// Ramp rule: a plant changes by at most 1 between consecutive hours.
const DK=3, FULL=(1<<(DK+1))-1;
const bits=m=>{const o=[];for(let v=0;v<=DK;v++)if(m>>v&1)o.push(v);return o};
const mn=m=>{for(let v=0;v<=DK;v++)if(m>>v&1)return v;return 99};
const mx=m=>{for(let v=DK;v>=0;v--)if(m>>v&1)return v;return -99};
const single=m=>m&&!(m&(m-1));
function dLines(N){const L=[];for(let r=0;r<N;r++){const a=[];for(let c=0;c<N;c++)a.push(r*N+c);L.push({kind:'row',id:r,cells:a})}
  for(let c=0;c<N;c++){const a=[];for(let r=0;r<N;r++)a.push(r*N+c);L.push({kind:'col',id:c,cells:a})}return L}
function dRandomSol(N,rnd){const g=new Int8Array(N*N);
  for(let c=0;c<N;c++){let v=(rnd()*(DK+1))|0;for(let r=0;r<N;r++){if(r>0){const opts=[v-1,v,v+1].filter(x=>x>=0&&x<=DK);v=opts[(rnd()*opts.length)|0]}g[r*N+c]=v}}
  return g}
// propagate to fixpoint with level<=maxL; returns false on contradiction. log callback(cell,newMask,level,info)
function dProp(N,P,cand,maxL,log){
  const L=P._L||(P._L=dLines(N));let changed=true;
  const set=(i,m,lvl,info)=>{if(m===cand[i])return true;cand[i]=m;changed=true;if(log)log(i,m,lvl,info);return m!==0};
  while(changed){changed=false;
    // L1 ramp
    for(let i=0;i<N*N;i++){let m=cand[i];const r=(i/N)|0;
      for(const j of [i-N,i+N]){if(j<0||j>=N*N)continue;let allow=0;for(const v of bits(cand[j]))for(const d of [-1,0,1]){const w=v+d;if(w>=0&&w<=DK)allow|=1<<w}m&=allow}
      if(m!==cand[i]&&!set(i,m,1,{}))return false}
    // L2 sums
    if(maxL>=2)for(const l of L){const t=l.kind==='row'?P.rowSum[l.id]:P.colSum[l.id];
      let smin=0,smax=0;for(const i of l.cells){smin+=mn(cand[i]);smax+=mx(cand[i])}
      if(smin>t||smax<t)return false;
      for(const i of l.cells){const omin=smin-mn(cand[i]),omax=smax-mx(cand[i]);let m=0;
        for(const v of bits(cand[i]))if(t-v>=omin&&t-v<=omax)m|=1<<v;
        if(m!==cand[i]&&!set(i,m,2,{line:l,t,omin,omax}))return false;
        if(changed)break}
      if(changed)break}
    if(changed||maxL<3)continue;
    // L3 what-if
    for(let i=0;i<N*N&&!changed;i++){if(single(cand[i]))continue;
      for(const v of bits(cand[i])){const c2=cand.slice();c2[i]=1<<v;if(!dProp(N,P,c2,2,null)){if(!set(i,cand[i]&~(1<<v),3,{v}))return false;break}}}
  }
  return true}
function dInit(N,P,fixed){const c=new Uint8Array(N*N).fill(FULL);for(let i=0;i<N*N;i++)if(fixed[i]>=0)c[i]=1<<fixed[i];return c}
function dCount(N,P,fixed,limit=2,budget=200000){let nodes=0,ab=false;const sols=[];
  (function dfs(cand){if(sols.length>=limit||ab)return;if(++nodes>budget){ab=true;return}
    if(!dProp(N,P,cand,2,null))return;let best=-1,bc=99;for(let i=0;i<N*N;i++){if(single(cand[i]))continue;const k=bits(cand[i]).length;if(k<bc){bc=k;best=i}}
    if(best<0){sols.push(Array.from(cand,m=>mn(m)));return}
    for(const v of bits(cand[best])){const c2=cand.slice();c2[best]=1<<v;dfs(c2);if(sols.length>=limit||ab)return}})(dInit(N,P,fixed));
  return{sols,aborted:ab}}
function dRate(N,P,fixed){const cand=dInit(N,P,fixed);let maxL=0,hard=0;
  const ok=dProp(N,P,cand,3,(i,m,l)=>{maxL=Math.max(maxL,l);if(l===3)hard++});
  return{solved:ok&&[...cand].every(single),maxL,hard}}
function genDispatch(N,diff,seed){
  const rnd=mulberry32(seed);const want={normal:[1,2],hard:[3,3],expert:[3,3]}[diff];let best=null;
  for(let attempt=0;attempt<30;attempt++){
    const sol=dRandomSol(N,rnd);const P={rowSum:[],colSum:[]};
    for(let r=0;r<N;r++){let s=0;for(let c=0;c<N;c++)s+=sol[r*N+c];P.rowSum.push(s)}
    for(let c=0;c<N;c++){let s=0;for(let r=0;r<N;r++)s+=sol[r*N+c];P.colSum.push(s)}
    const fixed=Array.from(sol);const order=shuffle([...Array(N*N).keys()],rnd);
    for(const i of order){const v=fixed[i];fixed[i]=-1;let ok;
      if(diff==='normal'){const r=dRate(N,P,fixed);ok=r.solved&&r.maxL<=2}
      else if(diff==='hard'){const r=dRate(N,P,fixed);ok=r.solved}
      else{const r=dCount(N,P,fixed,2);ok=!r.aborted&&r.sols.length===1}
      if(!ok)fixed[i]=v}
    const rt=dRate(N,P,fixed);const lvl=rt.solved?rt.maxL:4;
    if(diff!=='expert'&&!rt.solved)continue;
    const score=(lvl>=want[0]&&lvl<=want[1])?0:1;const nGiven=fixed.filter(v=>v>=0).length;
    const cand={score,nGiven,hard:rt.hard,fixed,sol:Array.from(sol),P,lvl};
    if(!best||score<best.score||(score===best.score&&(diff==='normal'?false:nGiven<best.nGiven)))best=cand;
    if(score===0&&(diff==='normal'||attempt>=3))break;
  }
  return{game:'dispatch',N,rowSum:best.P.rowSum,colSum:best.P.colSum,givens:best.fixed,solution:best.sol,level:best.lvl,seed,diff};
}
// step for hints: from user's (correct) entries, find the first cell that becomes fixed and why
function dHint(N,P,fixed){
  const cand=dInit(N,P,fixed);let found=null;const base=fixed;
  const why={};
  dProp(N,P,cand,3,(i,m,l,info)=>{if(found)return;if(!why[i])why[i]=[];why[i].push({l,info,m});if(single(m)&&base[i]<0)found={cell:i,val:mn(m),level:l,info,trail:why[i]}});
  return found}
