# Puzzle Gym

Four logic puzzles with a built-in coach. Every puzzle is generated fresh and checked to have **exactly one solution**. Hints explain the reasoning instead of just giving the answer.

| Game | Rules | What it trains |
|---|---|---|
| **Dispatch** (original) | Set each plant's output (0–3) for every hour. Each hour must meet its demand, each plant must hit its daily energy, and no plant ramps more than one step between hours. | Headroom and bounds reasoning |
| **Zip** | Draw one path through every cell, visiting the numbers in order. Walls block movement. | Spotting forced cells and dead ends |
| **Queens** | One queen per row, column and coloured region. Queens never touch, not even diagonally. | Elimination and pigeonhole logic |
| **Sun & Moon** | Equal suns and moons in every row and column, never three in a row. = means two cells match, × means they're opposite. | Chains of deductions and "what if" tests |

## Features

- Three difficulties, rated by the hardest reasoning step a puzzle needs, plus a choice of grid sizes
- A daily puzzle for every game, size and difficulty: everyone gets the same one each day
- Hints that name the technique and outline the cells involved, and that find your mistakes first
- Helpers you can switch on and off: alarms, forced moves, candidates, counts and more
- Progress is saved automatically, so you can leave a puzzle and come back to it
- Stats for each game and level: solves, best time without hints, average time
- Tap sounds made with Web Audio, with a mute button in the top bar
- Installable as an app and works offline once it has loaded
- Keyboard shortcuts: `H` hint, `N` new puzzle, `Ctrl/Cmd+Z` undo, arrow keys move in Zip

## Run it locally

There is no build step. Serve the folder over HTTP. The puzzle workers and offline mode need HTTP, not a `file://` path.

```bash
npm start            # same as: python3 -m http.server 8080
# then open http://localhost:8080
```

## Tests

```bash
npm test             # generates puzzles for every game and checks each has exactly one solution
```

There is also a browser smoke test that clicks through every game, control and helper:

```bash
pip install playwright && playwright install chromium
npm start &          # in another terminal
python3 tests/e2e_smoke.py http://localhost:8080/
```

## Hosting

It is a static site, so any static host works.

**GitHub Pages** (workflow included). In the repo go to *Settings → Pages → Build and deployment* and set *Source* to **GitHub Actions**. Every push to `main` then runs the tests and deploys the site. GitHub Pages on a **private** repo needs a paid GitHub plan. Otherwise make the repo public or use one of the hosts below.

**Netlify / Cloudflare Pages / Vercel.** Import the repo, leave the build command empty and set the publish directory to `/` (the repo root).

When you change any file, bump `VERSION` in `sw.js` so returning players get the new version instead of the cached one.

## Project layout

```
index.html            page shell
css/app.css           all styles and transitions
js/core/*.js          puzzle generators, solvers and logic engines (no DOM; also run in Node tests)
js/worker.js          runs generation off the main thread
js/app/sound.js       synthesised tap sounds
js/app/shell.js       shared state: timer, coach, overlay, toast, saving, generation
js/games/*.js         one module per game: rendering, input, hints
js/app/main.js        home screen, tabs, controls, routing, keyboard
sw.js, manifest.webmanifest, icons/   offline support and install
tests/                Node generator tests and the browser smoke test
```

### Adding a game

1. Put the generator and solver in `js/core/<game>.js`. It must return a puzzle object with `N`, `diff`, `seed` and `solution`.
2. Register it in `js/worker.js` and in `GEN` in `js/app/shell.js`.
3. Write a UI module in `js/games/<game>.js` with the same shape as the others: `start`, `render`, `down/move/up`, `hint`, `undo`, `reset`, `getState/setState`.
4. Add it to `GAMES`, `ICONS` and `BLURB` in `js/app/main.js`, and add its files to `index.html` and `sw.js`.
