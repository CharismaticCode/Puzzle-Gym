// Run with: node tests/generators.test.js
// Loads the puzzle cores exactly as the browser does and checks that every
// generated puzzle has exactly one solution and that the stored solution obeys the rules.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({ console, Math });
for (const f of ['common', 'zip', 'queens', 'tango', 'dispatch'])
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'core', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
const run = code => vm.runInContext(code, ctx);
let fails = 0, count = 0;
function check(name, ok, why) { count++; if (!ok) { fails++; console.log('FAIL', name, why || ''); } }

const quick = process.argv.includes('--quick');
const seeds = quick ? [1, 2] : [1, 2, 3, 4, 5];
for (const seed of seeds) {
  for (const [N, d] of [[6, 'normal'], [7, 'hard'], [8, 'expert']]) {
    const p = run(`generate(${N},'${d}',${seed})`);
    ctx.p = p;
    const r = run(`(()=>{const b=makeBoard(p.N);p.walls.forEach(k=>b.walls.add(k));return solve(b,p.clues,2,2e6)})()`);
    check(`zip ${N} ${d} #${seed} unique`, !r.aborted && r.sols.length === 1, JSON.stringify({ n: r.sols.length, ab: r.aborted }));
    check(`zip ${N} ${d} #${seed} solution`, r.sols[0] && r.sols[0].join() === p.solution.join());
  }
  for (const [N, d] of [[6, 'normal'], [8, 'hard'], [9, 'expert']]) {
    const p = run(`genQueens(${N},'${d}',${seed})`); ctx.p = p;
    const sols = run(`qCount(p.N,p.reg,2)`);
    check(`queens ${N} ${d} #${seed} unique`, sols.length === 1);
    check(`queens ${N} ${d} #${seed} solution`, sols[0] && sols[0].map((c, r) => r * N + c).join() === p.solution.join());
  }
  for (const [N, d] of [[6, 'normal'], [6, 'hard'], [8, 'expert']]) {
    const p = run(`genTango(${N},'${d}',${seed})`); ctx.p = p;
    const sols = run(`tCount(p.N,Int8Array.from(p.givens),p.edges,2)`);
    check(`tango ${N} ${d} #${seed} unique`, sols.length === 1);
    check(`tango ${N} ${d} #${seed} solution`, sols[0] && Array.from(sols[0]).join() === p.solution.join());
  }
  for (const [N, d] of [[5, 'normal'], [6, 'hard'], [7, 'expert']]) {
    const p = run(`genDispatch(${N},'${d}',${seed})`); ctx.p = p;
    const r = run(`dCount(p.N,{rowSum:p.rowSum,colSum:p.colSum},p.givens,2,2e6)`);
    check(`dispatch ${N} ${d} #${seed} unique`, !r.aborted && r.sols.length === 1);
    check(`dispatch ${N} ${d} #${seed} solution`, r.sols[0] && r.sols[0].join() === p.solution.join());
    let rampOk = true; for (let i = 0; i + N < N * N; i++) if (Math.abs(p.solution[i] - p.solution[i + N]) > 1) rampOk = false;
    check(`dispatch ${N} ${d} #${seed} ramps`, rampOk);
  }
}
// daily seeds are stable
check('daily seed stable', run(`hashStr('zip|2026-1-1|8|hard')`) === run(`hashStr('zip|2026-1-1|8|hard')`));
console.log(`${count - fails}/${count} checks passed`);
process.exit(fails ? 1 : 0);
