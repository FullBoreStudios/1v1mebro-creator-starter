/* Original canvas artwork and interface. MIT / FullBoreStudios. No network calls. */
(function () {
  'use strict';
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score'), comboEl = document.getElementById('combo'), timeEl = document.getElementById('time');
  const overlay = document.getElementById('overlay'), title = document.getElementById('overlay-title'), copy = document.getElementById('overlay-copy');
  const startButton = document.getElementById('start'), pauseButton = document.getElementById('pause'), motionButton = document.getElementById('motion');
  const seedInput = document.getElementById('seed'), feedback = document.getElementById('feedback');
  const stampButtons = Array.from(document.querySelectorAll('[data-stamp]'));
  const colors = ['#ffd073', '#f39379', '#b8d8c5'], ink = '#252a29', ivory = '#f9efe0';
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = preference.matches, running = false, paused = false, pending = null;
  let lastFrame = 0, accumulator = 0, lastFeedbackTick = -1;
  const params = new URLSearchParams(location.search);
  const requestedSeed = params.get('seed');
  if (requestedSeed !== null && /^\d{1,10}$/.test(requestedSeed) && Number(requestedSeed) <= 2147483647) seedInput.value = requestedSeed;
  let engine = StampSprint.createEngine(Number(seedInput.value)), state = engine.snapshot();

  function roundRect(x, y, w, h, radius, fill, stroke, width) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width || 2; ctx.stroke(); }
  }
  function text(value, x, y, size, color, weight) {
    ctx.font = (weight || '700') + ' ' + size + 'px system-ui,sans-serif';
    ctx.fillStyle = color || ink; ctx.fillText(value, x, y);
  }
  function symbol(which, x, y, size, color) {
    ctx.fillStyle = color || ink; ctx.beginPath();
    if (which === 0) ctx.arc(x, y, size, 0, Math.PI * 2);
    if (which === 1) { ctx.moveTo(x, y - size); ctx.lineTo(x + size, y + size); ctx.lineTo(x - size, y + size); ctx.closePath(); }
    if (which === 2) ctx.rect(x - size, y - size, size * 2, size * 2);
    ctx.fill();
  }
  function draw() {
    ctx.clearRect(0, 0, 600, 550);
    ctx.fillStyle = '#e2e4d7'; ctx.fillRect(0, 0, 600, 550);
    // Printed depot floor: decoration never enters the simulation.
    ctx.strokeStyle = '#c6cbbd'; ctx.lineWidth = 1;
    for (let x = -550; x < 600; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 550, 550); ctx.stroke(); }
    roundRect(115, -40, 370, 555, 35, '#aab3a5', ink, 3);
    roundRect(129, -35, 342, 536, 25, '#69756b', ink, 2);
    const shift = reduced ? 0 : state.tick * 2 % 38;
    for (let y = -38 + shift; y < 503; y += 38) {
      roundRect(144, y, 312, 21, 8, '#7e887b');
      ctx.strokeStyle = '#647164'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(161, y + 10); ctx.lineTo(438, y + 10); ctx.stroke();
    }
    // An accessible symbol-matching zone, independent of screen size.
    ctx.fillStyle = '#f9efe035'; ctx.fillRect(136, 318, 328, 178);
    ctx.setLineDash([9, 8]); ctx.strokeStyle = '#ffdc8a'; ctx.lineWidth = 3;
    ctx.strokeRect(139, 326, 322, 155); ctx.setLineDash([]);
    ctx.save(); ctx.translate(43, 376); ctx.rotate(-Math.PI / 2); text('STAMP ZONE', 0, 0, 12, ink, '900'); ctx.restore();
    text('↓', 75, 340, 27, ink); text('↓', 75, 410, 27, ink);
    roundRect(491, 58, 83, 34, 8, ivory, ink, 2); text('DEPOT 01', 502, 80, 11, ink);
    for (const p of state.parcels) {
      const y = -34 + p.age * 2.85, x = 300 + p.offset * 38;
      const tilt = reduced ? 0 : p.offset * .075;
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
      roundRect(-50, -38 + 7, 100, 76, 12, '#252a2938');
      roundRect(-50, -38, 100, 76, 12, colors[p.symbol], ink, 3);
      if (p.age >= StampSprint.READY_AGE) roundRect(-57, -45, 114, 90, 16, null, '#ffe6a6', 4);
      ctx.fillStyle = '#ffffff35'; ctx.fillRect(-9, -36, 18, 71);
      ctx.strokeStyle = '#252a291c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-47, 0); ctx.lineTo(47, 0); ctx.stroke();
      roundRect(-25, -25, 50, 50, 7, ivory, ink, 2); symbol(p.symbol, 0, 0, 12);
      text(String(p.id + 1).padStart(2, '0'), -40, -21, 8, '#252a2988');
      ctx.restore();
    }
    // Original toy supervisor character.
    const bob = reduced || !running || paused ? 0 : Math.sin(state.tick / 15) * 2;
    ctx.save(); ctx.translate(533, 388 + bob);
    roundRect(-24, -6, 48, 72, 15, '#f16b34', ink, 3);
    roundRect(-33, -45, 66, 57, 17, ivory, ink, 3);
    roundRect(-25, -37, 50, 37, 10, '#b8d8c5', ink, 2);
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(-10, -21, 3, 0, Math.PI * 2); ctx.arc(10, -21, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -19, 8, .3, Math.PI - .3); ctx.stroke();
    roundRect(-15, 15, 30, 18, 3, ink); text('01', -10, 28, 11, ivory);
    roundRect(-24, 64, 18, 13, 4, ink); roundRect(6, 64, 18, 13, 4, ink);
    ctx.beginPath(); ctx.moveTo(0, -45); ctx.lineTo(0, -58); ctx.stroke();
    ctx.fillStyle = '#f16b34'; ctx.beginPath(); ctx.arc(0, -61, 5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    const event = state.lastEvent, eventAge = state.tick - event.tick;
    if (event.type === 'correct' && eventAge < 35) {
      const progress = reduced ? 0 : eventAge / 35;
      ctx.globalAlpha = 1 - eventAge / 35;
      text('+' + event.points, 354, 361 - progress * 24, 26, ivory, '900');
      if (!reduced) for (let i = 0; i < 7; i += 1) {
        const angle = i * .9 + event.serial;
        roundRect(300 + Math.cos(angle) * progress * 99, 374 + Math.sin(angle) * progress * 65, 5, 5, 1, colors[i % 3]);
      }
      ctx.globalAlpha = 1;
    }
  }

  function updateMotion() {
    motionButton.textContent = reduced ? 'Motion reduced' : 'Motion on';
    motionButton.setAttribute('aria-pressed', String(reduced));
  }
  function update() {
    scoreEl.textContent = String(state.score).padStart(3, '0');
    comboEl.textContent = '×' + state.combo;
    timeEl.textContent = (state.ticksLeft / 60).toFixed(1);
    stampButtons.forEach(button => { button.disabled = !running || paused; });
    const event = state.lastEvent;
    if (event.tick !== lastFeedbackTick) {
      lastFeedbackTick = event.tick;
      if (event.type === 'correct') feedback.textContent = '+' + event.points + ' · nice stamp!';
      if (event.type === 'wrong') feedback.textContent = 'Wrong stamp. Next parcel, fresh streak.';
      if (event.type === 'miss') feedback.textContent = 'That one got away. Keep going.';
    }
    if (running && state.finished) {
      running = false; paused = false; seedInput.disabled = false; pauseButton.disabled = true;
      stampButtons.forEach(button => { button.disabled = true; });
      overlay.hidden = false; title.textContent = 'Shift complete.';
      copy.textContent = state.score + ' points · ' + state.correct + ' parcels stamped · best streak ' + state.bestCombo + '.';
      document.getElementById('overlay-note').textContent = 'Seed ' + state.seed + ' · try the same shift again.';
      startButton.innerHTML = 'Another shift <span aria-hidden="true">↗</span>';
      feedback.textContent = '45 seconds. All done.';
      startButton.focus({ preventScroll: true });
    }
  }
  function start() {
    if (running && !paused) return;
    if (running && paused) { setPaused(false); return; }
    const seed = Number(seedInput.value);
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 2147483647 || seedInput.value.trim() === '') {
      feedback.textContent = 'Choose a whole-number seed from 0 to 2147483647.'; seedInput.focus(); return;
    }
    engine = StampSprint.createEngine(seed); state = engine.snapshot(); pending = null;
    running = true; paused = false; accumulator = 0; lastFrame = 0; lastFeedbackTick = -1;
    overlay.hidden = true; seedInput.disabled = true; pauseButton.disabled = false; pauseButton.innerHTML = 'Pause <kbd>P</kbd>';
    feedback.textContent = 'Wait for the striped zone, then match the symbol.';
    stampButtons[0].focus({ preventScroll: true }); update(); draw();
  }
  function setPaused(value) {
    if (!running) return;
    paused = value; pending = null; accumulator = 0; lastFrame = 0;
    pauseButton.innerHTML = paused ? 'Resume <kbd>P</kbd>' : 'Pause <kbd>P</kbd>';
    overlay.hidden = !paused;
    if (paused) {
      title.textContent = 'Take a breather.'; copy.textContent = 'Your shift is paused. Resume when you are ready.';
      startButton.innerHTML = 'Back to work <span aria-hidden="true">↗</span>';
      document.getElementById('overlay-note').textContent = 'The timer and parcels wait for you.';
    }
    update(); draw();
  }
  function sort(which) {
    if (!running || paused || state.finished) return;
    pending = { sort: which };
    const button = stampButtons[which]; button.classList.add('pressed');
    setTimeout(() => button.classList.remove('pressed'), 100);
  }
  startButton.addEventListener('click', start);
  pauseButton.addEventListener('click', () => setPaused(!paused));
  motionButton.addEventListener('click', () => { reduced = !reduced; updateMotion(); draw(); });
  preference.addEventListener('change', event => { reduced = event.matches; updateMotion(); draw(); });
  stampButtons.forEach(button => button.addEventListener('pointerdown', event => { event.preventDefault(); sort(Number(button.dataset.stamp)); }));
  stampButtons.forEach(button => button.addEventListener('click', event => { if (event.detail === 0) sort(Number(button.dataset.stamp)); }));
  document.addEventListener('keydown', event => {
    if (event.target === seedInput || event.repeat) return;
    const key = event.key.toLowerCase(), keys = { '1': 0, a: 0, '2': 1, s: 1, '3': 2, d: 2 };
    if (Object.prototype.hasOwnProperty.call(keys, key)) { event.preventDefault(); sort(keys[key]); }
    if (key === 'p') { event.preventDefault(); setPaused(!paused); }
    if (key === 'enter' && (!running || paused) && event.target !== startButton) { event.preventDefault(); start(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running && !paused) setPaused(true); });
  function frame(now) {
    if (running && !paused) {
      if (!lastFrame) lastFrame = now;
      // Bound catch-up after a stalled rendering frame. No render-driven scoring.
      accumulator += Math.min((now - lastFrame) / 1000, .25); lastFrame = now;
      while (accumulator >= 1 / 60 && !state.finished) {
        state = engine.step(pending); pending = null; accumulator -= 1 / 60;
      }
      update(); draw();
    } else lastFrame = 0;
    requestAnimationFrame(frame);
  }
  // A read-only inspection hook supports browser QA without account API access.
  window.stampSprintDebug = () => ({ running, paused, reducedMotion: reduced, ...engine.snapshot() });
  updateMotion(); update(); draw(); requestAnimationFrame(frame);
})();
