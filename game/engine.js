/* Stamp Sprint rules v1. Original MIT-licensed code by FullBoreStudios. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StampSprint = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TICK_RATE = 60;
  const DURATION_TICKS = TICK_RATE * 45;
  const READY_AGE = 128;
  const DEADLINE_AGE = 180;

  // Same FNV-1a / Mulberry32 algorithm as the public 1v1meBro game API.
  function createRandom(seed) {
    let value = 2166136261;
    for (const char of String(seed)) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return function () {
      value = (value + 0x6d2b79f5) | 0;
      let t = Math.imul(value ^ (value >>> 15), value | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomAt(seed, namespace, index) {
    const stream = JSON.stringify([seed, 'stamp-sprint', 1, namespace]);
    return createRandom(JSON.stringify([stream, index]))();
  }

  function createEngine(seed) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647) {
      throw new RangeError('Seed must be an integer between 0 and 2147483647.');
    }
    let tick = 0, score = 0, combo = 0, bestCombo = 0, correct = 0, missed = 0, wrong = 0;
    let nextSpawn = 1, serial = 0, finished = false;
    const parcels = [], course = [];
    let lastEvent = { type: 'ready', tick: 0, serial: -1 };

    function snapshot() {
      return {
        seed, rulesVersion: 1, tickRate: TICK_RATE, tick, score, combo, bestCombo,
        correct, missed, wrong, finished, ticksLeft: DURATION_TICKS - tick,
        parcels: parcels.map(p => ({ ...p, age: tick - p.spawnTick })),
        course: course.map(p => ({ ...p })), lastEvent: { ...lastEvent },
      };
    }

    function step(input) {
      if (finished) return snapshot();
      tick += 1;
      if (tick === nextSpawn && tick <= DURATION_TICKS - DEADLINE_AGE) {
        const parcel = {
          id: serial,
          symbol: Math.floor(randomAt(seed, 'parcel-symbol', serial) * 3),
          offset: randomAt(seed, 'parcel-offset', serial) * 2 - 1,
          spawnTick: tick,
        };
        parcels.push(parcel);
        course.push({ ...parcel });
        serial += 1;
        // Time alone determines the course; input and score cannot change it.
        nextSpawn += Math.round(125 - 35 * tick / DURATION_TICKS);
      }

      for (let index = parcels.length - 1; index >= 0; index -= 1) {
        if (tick - parcels[index].spawnTick > DEADLINE_AGE) {
          const p = parcels.splice(index, 1)[0];
          combo = 0;
          missed += 1;
          lastEvent = { type: 'miss', tick, serial: p.id };
        }
      }

      if (input && Number.isInteger(input.sort) && input.sort >= 0 && input.sort < 3) {
        const index = parcels.findIndex(p => tick - p.spawnTick >= READY_AGE);
        if (index >= 0) {
          const p = parcels.splice(index, 1)[0];
          if (p.symbol === input.sort) {
            combo += 1;
            bestCombo = Math.max(combo, bestCombo);
            correct += 1;
            const points = 10 + Math.min(combo - 1, 5) * 2;
            score += points;
            lastEvent = { type: 'correct', tick, serial: p.id, points, symbol: p.symbol };
          } else {
            combo = 0;
            wrong += 1;
            lastEvent = { type: 'wrong', tick, serial: p.id, symbol: p.symbol };
          }
        }
      }

      if (tick === DURATION_TICKS) {
        finished = true;
        lastEvent = { type: 'finished', tick, serial: -1 };
      }
      return snapshot();
    }

    return Object.freeze({ step, snapshot });
  }

  return Object.freeze({ TICK_RATE, DURATION_TICKS, READY_AGE, DEADLINE_AGE, createRandom, randomAt, createEngine });
});
