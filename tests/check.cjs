'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const api = require('../game/engine.js');

function play(seed, strategy = 'perfect') {
  const engine = api.createEngine(seed);
  while (!engine.snapshot().finished) {
    const state = engine.snapshot();
    const front = state.parcels.find(p => p.age >= api.READY_AGE);
    let input;
    if (front && strategy === 'perfect') input = { sort: front.symbol };
    if (front && strategy === 'wrong') input = { sort: (front.symbol + 1) % 3 };
    engine.step(input);
  }
  return engine.snapshot();
}
const a = play(314159), b = play(314159), idle = play(314159, 'idle'), bad = play(314159, 'wrong');
assert.deepEqual(a, b, 'same seed and inputs must reproduce full state');
assert.deepEqual(a.course, idle.course, 'course must not depend on scoring or input');
assert.deepEqual(a.course, bad.course, 'wrong inputs must not change the course');
assert.notDeepEqual(a.course, play(271828).course, 'different seeds should generate different courses');
assert.equal(a.tick, api.DURATION_TICKS);
assert.equal(a.correct, a.course.length);
assert.equal(a.missed, 0);
assert.equal(a.wrong, 0);
assert.equal(a.bestCombo, a.correct);
assert.equal(a.score, a.correct * 20 - 30, 'streak bonus must cap at ten extra points');
assert.equal(idle.score, 0);
assert.equal(idle.missed, idle.course.length);
assert.equal(bad.score, 0);
assert.equal(bad.wrong, bad.course.length);
assert.equal(bad.combo, 0);
const early = api.createEngine(1);
for (let i = 0; i < api.READY_AGE; i += 1) early.step({ sort: 0 });
assert.equal(early.snapshot().parcels.length, early.snapshot().course.length, 'early presses cannot remove parcels');
assert.equal(early.snapshot().score, 0);
const late = api.createEngine(1);
for (let i = 0; i < api.DEADLINE_AGE + 2; i += 1) late.step();
assert.equal(late.snapshot().missed, 1, 'expired front parcel must count as missed');
const stopped = api.createEngine(123);
for (let i = 0; i < api.DURATION_TICKS; i += 1) stopped.step();
const end = stopped.snapshot(); stopped.step({ sort: 2 });
assert.deepEqual(stopped.snapshot(), end, 'finished results must remain immutable');
for (const seed of [-1, .5, NaN, true, 2147483648]) assert.throws(() => api.createEngine(seed), RangeError);
assert.doesNotThrow(() => api.createEngine(0));
assert.doesNotThrow(() => api.createEngine(2147483647));

// Replay the same tick-addressed inputs at varied render cadences. Rendering
// consumes no course RNG and every simulation step still happens exactly once.
function atFrameRate(fps, reducedMotion) {
  const engine = api.createEngine(314159);
  let accumulator = 0;
  while (!engine.snapshot().finished) {
    accumulator += 1 / fps;
    while (accumulator + 1e-10 >= 1 / 60 && !engine.snapshot().finished) {
      const state = engine.snapshot(), p = state.parcels.find(item => item.age >= 120);
      engine.step(p ? { sort: p.symbol } : undefined); accumulator -= 1 / 60;
    }
    // Visual preferences deliberately have no entry point into engine rules.
    void reducedMotion;
  }
  return engine.snapshot();
}
const fixture = atFrameRate(60, false);
for (const fps of [24, 30, 90, 120, 144]) {
  assert.deepEqual(atFrameRate(fps, false), fixture, 'frame-rate parity at ' + fps);
  assert.deepEqual(atFrameRate(fps, true), fixture, 'reduced-motion parity at ' + fps);
}

// Classic script compatibility: scripts do not depend on CommonJS or ESM.
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'game/engine.js'), 'utf8'), sandbox);
assert.equal(typeof sandbox.StampSprint.createEngine, 'function');
const config = JSON.parse(fs.readFileSync(path.join(root, '1v1mebro.json'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(root, '1v1mebro.schema.json'), 'utf8'));
// Offline fixture validation for the exact schema keywords this repo uses.
// Editors may also use a full Draft 2020-12 JSON Schema validator.
function validateSchema(value, rule, where = '$') {
  if (rule.$ref) validateSchema(value, rule.$ref.split('/').slice(1).reduce((node, key) => node[key], schema), where);
  if (rule.type === 'object') assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), where + ' object');
  if (rule.type === 'array') assert.ok(Array.isArray(value), where + ' array');
  if (rule.type === 'integer') assert.ok(typeof value === 'number' && Number.isInteger(value), where + ' integer');
  if (['string', 'boolean'].includes(rule.type)) assert.equal(typeof value, rule.type, where + ' type');
  if (Object.prototype.hasOwnProperty.call(rule, 'const')) assert.deepEqual(value, rule.const, where + ' constant');
  if (rule.enum) assert.ok(rule.enum.includes(value), where + ' enum');
  if (rule.minLength !== undefined) assert.ok(value.length >= rule.minLength, where + ' minimum length');
  if (rule.maxLength !== undefined) assert.ok(value.length <= rule.maxLength, where + ' maximum length');
  if (rule.pattern) assert.ok(new RegExp(rule.pattern).test(value), where + ' pattern');
  if (rule.maxItems !== undefined) assert.ok(value.length <= rule.maxItems, where + ' maximum items');
  if (rule.required) for (const key of rule.required) assert.ok(Object.prototype.hasOwnProperty.call(value, key), where + '.' + key + ' required');
  if (rule.properties) {
    if (rule.additionalProperties === false) for (const key of Object.keys(value)) assert.ok(Object.prototype.hasOwnProperty.call(rule.properties, key), where + '.' + key + ' extra key');
    for (const [key, child] of Object.entries(rule.properties)) if (Object.prototype.hasOwnProperty.call(value, key)) validateSchema(value[key], child, where + '.' + key);
  }
  if (rule.items) value.forEach((item, index) => validateSchema(item, rule.items, where + '[' + index + ']'));
  if (rule.anyOf) {
    const matches = rule.anyOf.some(option => { try { validateSchema(value, option, where); return true; } catch { return false; } });
    assert.ok(matches, where + ' anyOf');
  }
}
validateSchema(config, schema);
assert.throws(() => validateSchema({ ...config, $schema: 'unexpected' }, schema), /extra key/);
assert.throws(() => validateSchema({ ...config, schema_version: true }, schema), /integer/);
assert.throws(() => validateSchema({ ...config, permissions: { hosting_allowed: false, modification_allowed: true } }, schema), /constant/);
const withoutThumbnail = JSON.parse(JSON.stringify(config));
delete withoutThumbnail.game.thumbnail;
assert.doesNotThrow(() => validateSchema(withoutThumbnail, schema), 'thumbnail remains optional for existing submissions');
for (const thumbnail of ['../outside.png', 'https://example.com/card.png', '/absolute.png', 'image.svg']) {
  assert.throws(() => validateSchema({ ...config, game: { ...config.game, thumbnail } }, schema), /pattern/);
}
assert.equal(config.schema_version, 1);
assert.equal(config.game.player_count, 1);
assert.equal(config.game.seeded, true);
assert.equal(config.game.reduced_motion, true);
assert.equal(config.assets.rights_confirmed, true);
assert.equal(config.permissions.hosting_allowed, true);
assert.equal(config.permissions.modification_allowed, true);
assert.equal(config.license.spdx_id, 'MIT');
assert.ok(fs.existsSync(path.join(root, config.license.file)));
assert.equal(fs.readFileSync(path.join(root, 'game/LICENSE.txt'), 'utf8'), fs.readFileSync(path.join(root, config.license.file), 'utf8'), 'rehosted release must preserve the complete license notice');
assert.ok(fs.existsSync(path.join(root, config.game.build_directory, config.game.entrypoint)));
// This sample ships a PNG screenshot; the portal also accepts JPEG and WebP.
// Verify the declared file rather than assuming a conventional root filename.
assert.equal(typeof config.game.thumbnail, 'string', 'the example includes an optional thumbnail');
const buildRoot = fs.realpathSync(path.join(root, config.game.build_directory));
const thumbnailPath = fs.realpathSync(path.join(buildRoot, config.game.thumbnail));
assert.ok(thumbnailPath.startsWith(buildRoot + path.sep), 'thumbnail must remain inside the committed static release');
const thumbnail = fs.readFileSync(thumbnailPath);
assert.ok(thumbnail.length > 0 && thumbnail.length <= 1024 * 1024, 'thumbnail must fit the 1 MiB limit');
assert.equal(path.extname(thumbnailPath).toLowerCase(), '.png', 'update the sample image checks if changing its format');
assert.ok(thumbnail.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'thumbnail must contain actual PNG bytes');
assert.equal(thumbnail.subarray(12, 16).toString('ascii'), 'IHDR');
const thumbnailWidth = thumbnail.readUInt32BE(16), thumbnailHeight = thumbnail.readUInt32BE(20);
assert.ok(thumbnailWidth > 0 && thumbnailWidth <= 4096 && thumbnailHeight > 0 && thumbnailHeight <= 4096, 'thumbnail dimensions must fit the portal limit');
const thumbnailRepoPath = path.relative(root, thumbnailPath).split(path.sep).join('/');
assert.ok(config.assets.attributions.some(item => item.path === thumbnailRepoPath && item.author === config.author.name && item.license === config.license.spdx_id), 'original screenshot must retain its author and license attribution');
for (const filename of ['index.html', 'style.css', 'engine.js', 'app.js']) {
  const content = fs.readFileSync(path.join(root, 'game', filename), 'utf8');
  assert.doesNotMatch(content, /https?:\/\/|fetch\s*\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|type\s*=\s*["']module["']/, filename + ' must work offline in an opaque-origin sandbox');
}
console.log('Stamp Sprint checks passed: seeded parity, scoring, timer, release files, thumbnail, classic scripts, and offline isolation.');
console.log('Thumbnail:', thumbnailWidth + 'x' + thumbnailHeight, thumbnail.length, 'bytes;', config.game.thumbnail);
console.log('Perfect seed 314159 shift:', a.score, 'points;', a.correct, 'parcels;', api.DURATION_TICKS, 'ticks.');
