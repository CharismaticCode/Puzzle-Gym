// Shared helpers: seeded RNG, hashing, shuffling, grid neighbours
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function shuffle(a,rnd){for(let i=a.length-1;i>0;i--){const j=(rnd()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function nb4(N,c){const r=(c/N)|0,k=c%N,o=[];if(r>0)o.push(c-N);if(r<N-1)o.push(c+N);if(k>0)o.push(c-1);if(k<N-1)o.push(c+1);return o}
