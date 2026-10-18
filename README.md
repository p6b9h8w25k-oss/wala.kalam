# ولا كلمة (Wala Kalam)

Arabic party game for **one shared phone**. Two teams; one player acts out a secret word with hands only
(90 s). If time runs out, the other team gets a 10 s **steal**. Plain HTML/CSS/JS (ES modules), no backend,
no framework, no runtime dependencies.

## Run
```
node server.mjs          # http://localhost:8080   (or: node server.mjs 3000)
```
ES modules don't load from `file://`, so use the server above (or any static host: Netlify, GitHub Pages,
Cloudflare Pages - just upload the folder). Needs Node 18+ only for this helper and the tests.

## Tests
```
npm test                 # 28 unit tests of the pure game logic (teams, turns, words, scoring, steal, replay)
npm run test:e2e         # browser test at 390x844 with a fake clock (needs Playwright + Chromium)
```
The E2E script saves screenshots (default `/tmp/wk-shots`, or pass a folder).

## Structure
```
index.html
styles/   tokens.css (palette, type, motion) · base.css · components.css · screens.css · motion.css
data/     words-ar.js                      <- the word bank (pure data)
js/core/  game.js (state machine) teams.js turns.js words.js rng.js   <- no DOM, fully unit-tested
js/ui/    app.js (controller + tick loop + sounds + navigation), audio.js, gestures.js, stopwatch.js,
          overlays.js, parts.js, dom.js, icons.js, screens/{welcome,teams,handoff,turn,result,final}.js
js/fonts.generated.js                      <- thmanyah fonts, bundled (see below)
assets/   sounds/ (your 4 files, mp3) · brand/logo.jpg
scripts/build-fonts.mjs · server.mjs · tests/
```

## How the rules are enforced
* `game.js` is a state machine (`SETUP → TEAM_CONFIRMATION → HANDOFF → BASIC_TURN → STEAL → TURN_RESULT → HANDOFF … → FINAL_RESULTS`).
  Invalid transitions throw. Every scoring path checks `(phase, resolved)`, so a score can't apply twice.
* Time never lives in `setInterval`. Countdowns are **deadlines** compared with `performance.now()`; one tick loop
  (rAF + a 250 ms interval) calls `game.tick(now)`, which is idempotent. A late press after the deadline cannot score.
* A steal never changes `turnIndex`; only `advance()` does.
* The secret word is reachable only through `game.getSecretWord()`, which returns `null` in every phase except the live
  basic turn. It is not in the DOM at handoff, steal or result screens. Backgrounding the tab closes the card.

## Change things
| What | Where |
|---|---|
| Words / categories | `data/words-ar.js` (append to a list, or add `{id,label,icon,words}`; icon names live in `js/ui/icons.js`) |
| Colours, type scale, radii, motion timings | `styles/tokens.css` |
| Team names | `TEAM_NAMES` in `js/ui/dom.js` |
| Turn lengths | `BASIC_MS`, `STEAL_MS`, `STEAL_ANNOUNCE_MS` in `js/core/game.js` |
| Player limits | `MIN_PLAYERS`, `MAX_PLAYERS`, `MAX_NAME` in `js/core/teams.js` |
| Sounds | replace files in `assets/sounds/` (keep names) or edit `FILES` in `js/ui/audio.js`; the 4 synthesised sounds (time-up, steal win/fail, tie) are in `_synth()` |
| Font | edit `FACES` in `scripts/build-fonts.mjs`, then `node scripts/build-fonts.mjs "<path to thmanyah typeface folder>"` |
| Logo | replace `assets/brand/logo.jpg` |

## Fonts and licence (please read)
The thmanyah licence allows websites only "as part of a compiled, packaged, or obfuscated product" and forbids
making the font downloadable as a file. So there are **no font files in this project**: `scripts/build-fonts.mjs`
packs the WOFF2 data, XOR-scrambled, into `js/fonts.generated.js`, which is rebuilt in memory with the `FontFace` API.
This is a deterrent, not security; confirm your exact use with ask@thmanyah.com. Boska (English) was supplied but is
not used because the interface is Arabic-only.

## Assets
| Asset | Source |
|---|---|
| thmanyah Sans / Display | supplied by you, thmanyah Font License |
| logo.jpg (cat + wordmark) | supplied by you, resized to 720 px |
| 4 sound files | supplied by you, converted to mp3 (transition trimmed to 2.4 s) |
| time-up / steal-win / steal-fail / tie sounds | original, generated with the Web Audio API |
| icons, stopwatch, medal, seesaw | original inline SVG |

## Deliberate decisions and limits
* Shared player (odd counts) sits **first in Team A and last in Team B** so their two turns are never back-to-back
  (the earlier "last in A, first in B" would be adjacent with 3 players).
* The steal has a 1.6 s announcement ("لم تتم الإجابة") before its 10 s start. Reaching 0 counts as a miss.
* After a **failed steal** the result screen shows the word. It is never shown on any other result screen.
* No match recovery: a page reload ends the match. Only sound settings are saved (localStorage).
* Word bank fixes (typos in the supplied list): نسز→نسر, الحق→القوس, غرف→غرفة العمليات, كرة الطائرة→الكرة الطائرة,
  "شوربة داكنة"→"شوربة", "سوشي roll"→"رول سوشي". Same word in two categories (e.g. السباحة / سباحة) counts once per match.
* Audio could not be heard in the test environment; playback code paths run, but loudness/mix needs a listen on a real phone.
* Not tested on a physical iPhone/Android: only Chromium emulation at 390x844 and 375x667.
