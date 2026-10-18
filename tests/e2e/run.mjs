// Browser end-to-end test at iPhone size. Usage: node tests/e2e/run.mjs [screenshotDir]
// Uses Playwright's fake clock so the 90 s / 10 s timers can be fast-forwarded deterministically.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { start } from '../../server.mjs';
import { CATEGORIES } from '../../data/words-ar.js';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/home/claude/.npm-global/lib/node_modules/playwright'); }
const shots = process.argv[2] || '/tmp/wk-shots';
mkdirSync(shots, { recursive: true });
const ALL_WORDS = new Set(CATEGORIES.flatMap((c) => c.words));

let pass = 0, fail = 0;
const ok = (cond, name) => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`); };

const srv = await start(8199);
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: 'ar-SA' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.clock.install({ time: 0 });
await page.goto('http://localhost:8199/');
await page.clock.runFor(1200);
await page.waitForSelector('#splash', { state: 'detached', timeout: 5000 }).catch(() => {});

const shot = (n) => page.screenshot({ path: `${shots}/${n}.png` });
const phase = () => page.evaluate(() => window.__wk.game.phase);
const scores = () => page.evaluate(() => window.__wk.game.scores);
const text = () => page.evaluate(() => document.getElementById('app').innerText);
const click = async (sel) => { await page.locator(sel).first().tap(); await page.clock.runFor(60); };
const clickText = async (t) => { await page.getByRole('button', { name: t }).first().tap(); await page.clock.runFor(60); };
let lastHits = [];
const noWordVisible = async () => { const t = await text(); lastHits = [...ALL_WORDS].filter((w) => new RegExp(`(^|[^\\p{L}])${w.replace(/[()]/g, '\\$&')}($|[^\\p{L}])`, 'u').test(t)); return lastHits.length === 0; };

// ---- fonts
const fontOk = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('700 20px "thmanyah Sans"') && [...document.fonts].some((f) => f.family.includes('thmanyah') && f.status === 'loaded'); });
ok(fontOk, 'thmanyah fonts load from the bundled module');
await shot('01-welcome');

// ---- registration + validation
await clickText('إضافة لاعب');
ok((await text()).includes('اكتب اسم اللاعب'), 'empty name is rejected with an Arabic message');
const names = ['سارة', 'أحمد', 'ليلى', 'خالد', 'نورة'];
for (const n of names) { await page.fill('input[type=text]', n); await page.keyboard.press('Enter'); await page.clock.runFor(30); }
await page.fill('input[type=text]', 'سارة'); await page.keyboard.press('Enter');
ok((await text()).includes('موجود بالفعل'), 'duplicate name rejected');
ok((await page.locator('.player').count()) === 5, 'five players listed');
await page.evaluate(() => document.querySelector('.screen').scrollTo(0, 400)); await page.clock.runFor(800);
await shot('02-registered');
// category toggle
await page.locator('.chip').first().tap(); await page.clock.runFor(60);
ok((await page.locator('.chip[aria-pressed=true]').count()) === 6, 'category can be disabled');
await page.locator('.chip').first().tap();
// delete + undo
await page.getByRole('button', { name: 'حذف نورة' }).tap(); await page.clock.runFor(400);
ok((await page.locator('.player').count()) === 4, 'player removed');
await page.getByRole('button', { name: 'تراجع' }).tap(); await page.clock.runFor(100);
ok((await page.locator('.player').count()) === 5, 'undo restores player');
// rules sheet + sound sheet
await page.evaluate(() => document.querySelector('.screen').scrollTo(0, 0));
await clickText('طريقة اللعب'); await page.clock.runFor(700); await shot('03-rules');
ok(await page.locator('.slides').isVisible(), 'rules sheet opens');
await page.keyboard.press('Escape'); await page.clock.runFor(100);
ok((await page.locator('.slides').count()) === 0, 'Escape closes rules');
await clickText('إعدادات الصوت'); await page.clock.runFor(500); await shot('04-sound');
await page.keyboard.press('Escape'); await page.clock.runFor(100);

// ---- teams (5 players => shared)
await page.evaluate(() => document.querySelector('.screen').scrollTo(0, 99999));
await clickText('التالي: توزيع الفرق'); await page.clock.runFor(800);
ok((await phase()) === 'TEAM_CONFIRMATION', 'moves to team confirmation');
const t1 = await page.evaluate(() => JSON.stringify(window.__wk.game.teams));
ok(await page.evaluate(() => { const g = window.__wk.game; return g.sharedId && g.teams.A.members.length === 3 && g.teams.B.members.length === 3; }), 'odd count: shared player in both teams, 3 + 3');
await shot('05-teams-A');
await page.locator('.deck').evaluate((d) => d.scrollTo({ left: -d.clientWidth, behavior: 'instant' })); await page.clock.runFor(500);
await shot('06-teams-B');
let changed = false;
for (let i = 0; i < 6 && !changed; i++) { await clickText('إعادة الخلط'); changed = (await page.evaluate(() => JSON.stringify(window.__wk.game.teams))) !== t1; }
ok(changed, 'reshuffle gives a different split');
await clickText('تأكيد وابدأ المباراة'); await page.clock.runFor(800);
ok((await phase()) === 'HANDOFF', 'confirm -> handoff');
const teamsAtStart = await page.evaluate(() => JSON.stringify(window.__wk.game.teams));

// ---- handoff privacy
ok(await noWordVisible(), 'no secret word anywhere on the handoff screen');
ok((await page.evaluate(() => window.__wk.game.getSecretWord())) === null, 'game exposes no word at handoff');
await shot('07-handoff');

// ---- basic turn 1: reveal, timer, correct
await clickText('أنا جاهز');
await page.clock.runFor(1000);
ok((await phase()) === 'BASIC_TURN', 'reveal starts the basic turn');
const w1 = await page.evaluate(() => window.__wk.game.getSecretWord());
ok(!!w1 && (await text()).includes(w1) === true, 'word shown after reveal');
ok((await text()).includes('٠١:٢٩') || (await text()).includes('٠١:٣٠'), 'timer starts at 01:30');
ok(await page.getByRole('button', { name: /skip|تخطي|تجاوز/i }).count() === 0, 'no skip button exists');
await page.clock.runFor(5000); await shot('08-basic');
// rapid double press => +1 only
await page.locator('.btn-key', { hasText: 'تمت الإجابة' }).dispatchEvent('click');
await page.locator('.btn-key', { hasText: 'تمت الإجابة' }).dispatchEvent('click').catch(() => {});
await page.clock.runFor(900);
ok((await phase()) === 'TURN_RESULT' && (await scores()).A === 1 && (await scores()).B === 0, 'correct answer: exactly +1 for team A (rapid double press ignored)');
ok(await noWordVisible(), 'word hidden on the result screen');
await shot('09-result-correct');
await clickText('الدور التالي'); await page.clock.runFor(700);
ok((await page.evaluate(() => window.__wk.game.currentTurn.teamId)) === 'B', 'next turn alternates to team B');

// ---- turn 2: let the 90 s expire -> steal -> success (+2 to A)
await clickText('أنا جاهز');
await page.clock.runFor(60000);
ok((await phase()) === 'BASIC_TURN', 'still basic at 60 s');
await page.clock.runFor(30100);
ok((await phase()) === 'STEAL', 'steal starts when 90 s expire');
ok((await text()).includes('لم تتم الإجابة'), 'shows «لم تتم الإجابة»');
ok(await noWordVisible(), 'word hidden during steal');
await shot('10-steal-announce');
await page.clock.runFor(1700);
await page.clock.runFor(3000); await shot('11-steal-running');
const turnBefore = await page.evaluate(() => window.__wk.game.turnIndex);
await clickText('أصابوا الكلمة');
await page.clock.runFor(900);
ok((await scores()).A === 3 && (await scores()).B === 0, 'successful steal: +2 to the OTHER team (A)');
ok((await page.evaluate(() => window.__wk.game.turnIndex)) === turnBefore, 'steal did not change the turn index');
ok((await text()).includes('نجحت السرقة'), 'shows «نجحت السرقة! +٢»');
await shot('12-result-steal');
await clickText('الدور التالي'); await page.clock.runFor(700);
ok((await page.evaluate(() => window.__wk.game.currentTurn.teamId)) === 'A', 'turn after a steal continues the alternation (A)');

// ---- turn 3: expire then let the 10 s run out -> fail, 0 points
await clickText('أنا جاهز');
await page.clock.runFor(90100); await page.clock.runFor(1700);
await page.clock.runFor(10100);
ok((await phase()) === 'TURN_RESULT', 'steal ends automatically after 10 s');
ok((await scores()).A === 3 && (await scores()).B === 0, 'failed steal (timeout): no points');
await shot('13-result-fail');
ok((await text()).includes('فشلت السرقة'), 'shows failed-steal result');
await clickText('الدور التالي'); await page.clock.runFor(700);

// ---- home confirmation mid-match: cancel keeps game
await clickText('الرئيسية'); await page.clock.runFor(400);
await shot('14-home-confirm');
ok(await page.locator('.dialog').isVisible(), 'home icon asks for confirmation during a match');
await clickText('أكمل اللعب'); await page.clock.runFor(300);
ok((await phase()) === 'HANDOFF', 'cancelling keeps the match');

// ---- finish: B explains (turn 4) fail steal button; remaining turns answered
async function answerTurn() { await clickText('أنا جاهز'); await page.clock.runFor(500); await page.locator('.btn-key', { hasText: 'تمت الإجابة' }).tap(); await page.clock.runFor(300); await clickText('الدور'); await page.clock.runFor(500); }
let guard = 0;
while ((await phase()) !== 'FINAL_RESULTS' && guard++ < 10) {
  await clickText('أنا جاهز'); await page.clock.runFor(500);
  await page.locator('.btn-key', { hasText: 'تمت الإجابة' }).tap(); await page.clock.runFor(900);
  const b = page.getByRole('button', { name: /الدور التالي|النتيجة النهائية/ }); await b.first().tap(); await page.clock.runFor(900);
}
ok((await phase()) === 'FINAL_RESULTS', 'final results only after all 6 basic turns');
ok(await page.evaluate(() => window.__wk.game.turnIndex === window.__wk.game.totalTurns), 'turn counter at the end');
await page.clock.runFor(1500); await shot('15-final');
const fin = await scores();
ok(fin.A + fin.B > 0, `final scores ${fin.A} - ${fin.B}`);
ok((await text()).includes(fin.A === fin.B ? 'تعادل' : 'فاز'), 'winner/tie announced');

// ---- replay same teams
await clickText('إعادة اللعب بنفس الفرق'); await page.clock.runFor(700);
ok((await scores()).A === 0 && (await scores()).B === 0 && (await phase()) === 'HANDOFF', 'replay resets scores');
ok((await page.evaluate(() => JSON.stringify(window.__wk.game.teams))) === teamsAtStart, 'replay keeps the same teams');
ok(await page.evaluate(() => window.__wk.game.turnIndex === 0 && window.__wk.game.getSecretWord() === null), 'replay resets turn order and hides the word');

// ---- new game via home (confirm) -> setup keeps roster
await clickText('الرئيسية'); await clickText('نعم، اخرج'); await page.clock.runFor(700);
ok((await phase()) === 'SETUP' && (await page.locator('.player').count()) === 5, 'leaving returns to setup with players kept');

// ---- reduced motion + a long-name layout check
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.fill('input[type=text]', 'عبدالرحمن بن محمد الشمري الكبير'.slice(0, 20)); await page.keyboard.press('Enter');
await page.clock.runFor(500); await shot('16-long-name');
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
ok(!overflow, 'no horizontal overflow at 390px');
ok(errors.length === 0, `no console/page errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);

await browser.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
