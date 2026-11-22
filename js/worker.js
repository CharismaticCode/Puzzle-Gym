// Puzzle generation runs here so the page never freezes.
importScripts('core/common.js', 'core/zip.js', 'core/queens.js', 'core/tango.js', 'core/dispatch.js');
const GEN = { zip: generate, queens: genQueens, tango: genTango, dispatch: genDispatch };
onmessage = e => {
  const { game, N, diff, seed, token } = e.data;
  postMessage({ token, puzzle: GEN[game](N, diff, seed) });
};
