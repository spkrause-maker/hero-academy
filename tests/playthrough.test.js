// Automated playthrough of Hero Academy in a simulated browser (jsdom).
// Run with: npm test
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const DAY = 86400000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function openGame(savedProgress) {
  const dom = new JSDOM(HTML, {
    url: 'https://example.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(w) {
      w.scrollTo = () => {};
      if (savedProgress) w.localStorage.setItem('hero-academy-v1', JSON.stringify(savedProgress));
    },
  });
  const w = dom.window;
  const d = w.document;
  const errors = [];
  w.addEventListener('error', (e) => errors.push(e.message));
  // Let tests move the clock forward
  const realNow = w.Date.now.bind(w.Date);
  const clock = { offset: 0 };
  w.Date.now = () => realNow() + clock.offset;

  const $ = (s) => d.querySelector(s);
  const app = () => d.getElementById('app').textContent;
  const click = (s) => {
    const el = $(s);
    assert.ok(el, `expected to find ${s}`);
    el.click();
  };
  const key = (k) => click(`[data-act="key"][data-arg="${k}"]`);
  const type = (n) => { String(n).split('').forEach(key); key('GO'); };
  const nextMove = () => ({
    title: $('.nextcard .display')?.textContent,
    cta: $('.nextcard .btn')?.textContent,
    chips: [...d.querySelectorAll('.chap .chip')].map((c) => c.textContent),
  });

  async function doLesson() {
    click('.nextcard .btn');
    while ($('[data-act=lessonNext]')) click('[data-act=lessonNext]');
    const [, a, b] = $('.question').textContent.match(/(\d+) × (\d+)/);
    type(a * b);
    assert.match(app(), /POWER (UNLOCKED|REVIEWED)/);
  }

  // Plays the current mission. missAt: question index to answer wrong first.
  async function playMission(missAt = -1) {
    const teams = {};
    let reviews = 0;
    for (let q = 0; q < 40; q++) {
      const qt = $('.question');
      if (!qt || $('.banner') || /MISSION COMPLETE|YOU DEFEATED/.test(app())) break;
      const now = [...d.querySelectorAll('.rcell')].find((c) => c.classList.contains('now'));
      const team = now?.querySelector('.tchip')?.textContent;
      teams[team] = (teams[team] || 0) + 1;
      if (now?.textContent.includes('(review)')) reviews++;
      const [, a, b] = qt.textContent.match(/(\d+) × (\d+)/);
      if (q === missAt) {
        type(a * b + 1);
        assert.match(app(), /TRAINING ROOM/);
        type(a * b);
      } else {
        type(a * b);
      }
      await sleep(800);
    }
    return { teams, reviews };
  }

  return { w, d, $, app, click, nextMove, doLesson, playMission, clock, errors };
}

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('fresh start shows one next move: learn the first power', async () => {
  const g = openGame();
  await sleep(300);
  const nm = g.nextMove();
  assert.equal(nm.title, "LEARN THE DOUBLERS' POWER");
  assert.equal(nm.cta, 'START TRAINING');
  assert.deepEqual(nm.chips, ['Start here', 'Locked', 'Locked', 'Locked']);
  assert.match(g.$('.streak').textContent, /Streak: 0 days/);
  assert.match(g.app(), /ATTACKING YOUR SCHOOL/);
  assert.deepEqual(g.errors, []);
});

test('full game: three chapters, review, a miss, and the final battle', async () => {
  const g = openGame();
  await sleep(300);

  // Chapter 1
  await g.doLesson();
  g.click('[data-act=home]');
  assert.equal(g.nextMove().title, "TODAY'S MISSION");
  assert.ok(g.$('.nextcard [data-act=lesson][data-arg=D]'), 'review link during chapter');
  g.click('.nextcard .btn');
  let r = await g.playMission();
  assert.equal(r.teams.Doublers, 10, 'chapter 1 mission is all Doublers plus warm-ups');
  assert.match(g.$('.banner').textContent, /CHAPTER 1 COMPLETE/);
  g.click('[data-act=home]');
  assert.equal(g.nextMove().title, 'CHAPTER 2 UNLOCKED!');
  assert.deepEqual(g.nextMove().chips, ['Complete', 'Unlocked!', 'Locked', 'Locked']);

  // Two days later: Doublers are due for review during Chapter 2
  g.clock.offset = 2 * DAY;
  await g.doLesson();
  g.click('[data-act=home]');
  g.click('.nextcard .btn');
  r = await g.playMission(0);
  assert.equal(r.reviews, 2, 'two review questions from Chapter 1');
  assert.ok(r.teams['Trio Force'] >= 8, 'mostly current chapter');
  g.click('[data-act=home]');
  assert.equal(g.nextMove().chips[0], 'Complete', 'a miss never un-finishes a chapter');
  // A hero missed on its first try isn't powered yet, so finish the chapter
  for (let i = 0; i < 4 && g.nextMove().title === "TODAY'S MISSION"; i++) {
    g.click('.nextcard .btn');
    await g.playMission();
    g.click('[data-act=home]');
  }
  assert.equal(g.nextMove().title, 'CHAPTER 3 UNLOCKED!');

  // Chapter 3
  await g.doLesson();
  g.click('[data-act=home]');
  g.click('.nextcard .btn');
  await g.playMission();
  g.click('[data-act=home]');

  // Final battle
  assert.equal(g.nextMove().cta, 'START FINAL BATTLE');
  assert.deepEqual(g.nextMove().chips, ['Complete', 'Complete', 'Complete', 'Unlocked!']);
  g.click('.nextcard .btn');
  r = await g.playMission();
  assert.ok(r.teams.Doublers && r.teams['Trio Force'] && r.teams['Plus-One'], 'final battle mixes all teams');
  assert.match(g.app(), /YOU DEFEATED/);
  g.click('[data-act=home]');
  assert.match(g.$('.nextcard').textContent, /beaten him 1 time/);
  assert.deepEqual(g.errors, []);
});

test('existing progress carries over into chapters', async () => {
  const g = openGame({
    progress: {
      lessons: { D: true, T: true, P: false },
      facts: { '4x4': { rank: 3, due: 0, times: [] }, '3x3': { rank: 2, due: 0, times: [] } },
      streak: { last: null, days: 2 },
      missions: 4,
    },
  });
  await sleep(300);
  assert.equal(g.nextMove().title, "TODAY'S MISSION");
  assert.equal(g.nextMove().chips[0], 'In progress');
  g.click('[data-act=collection]');
  assert.ok(g.$('.cards'));
  g.click('[data-act=setup]');
  assert.equal(g.d.querySelectorAll('.slot').length, 16);
  assert.deepEqual(g.errors, []);
});

(async () => {
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`✗ ${t.name}\n  ${e.message}`);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  process.exit(failed ? 1 : 0);
})();
