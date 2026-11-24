// @ts-check
/* Sounds for the tools on samplesize1.com, made in the visitor's browser with Web Audio: every sound is built here
 * from a few tones, a little filtered noise and a small made-up room, so there are no sound files to load and
 * nothing to license. (Everything stays in the visitor's browser.)
 *
 * In a tool page:
 *
 *   <script src="/js/sound.js"></script>
 *   …
 *   const sound = SiteSound.kit('glass');
 *   sound.play('correct', streak)    // a right answer; streak = how many in a row (1, 2, 3…)
 *   sound.play('finish', 'good')     // the end of a round
 *   sound.play('correct', streak, { pan: -0.4 })   // …heard a little to the left (-1 left … 1 right)
 *
 * The moments a kit has (a kit without one stays silent for it):
 *
 *   correct(streak)                 a right answer. In Glass the same two wooden notes every time, with a glass
 *                                   sparkle on every fifth in a row and a bigger one on every tenth; the kits
 *                                   nothing uses yet climb a scale with the streak
 *   close(streak)                   right but misspelled (the geography tools' Easy typing): a softer right answer
 *   wrong                           a miss: lower and quieter than a right answer, never a buzzer
 *   found                           after a miss, the right one clicked
 *   skip                            a question skipped, or "show me"
 *   finish(grade)                   the end of a round: 'perfect' (nothing missed), 'good' (two thirds or more right)
 *                                   or 'rough'
 *   best                            a new best score, played just after finish
 *   key, hint, named                a letter typed in an answer, a hint given, a typed answer right
 *   mode                            Study, Practice or Test picked (and the Sound switch turned on)
 *   xrayOn, xrayOff, layer, zoom    the view changed
 *
 * Nothing plays for looking around: a piece or a place clicked to look at it in Explore, the arrow keys or Previous /
 * Next going from one to the next, skipping ahead in a list of questions, turning or dragging, hovering, the camera
 * moving on its own. (Explore's click and the arrows had a soft tap until Nov 22, 2026: clicking from one piece to the
 * next made a stream of noise that told the visitor nothing. Don't add one back, in a kit or in a tool.)
 *
 * The kits: glass (the 3D atlases), glass-quick (the geography tools: Glass made for fast rounds of typed or clicked
 * answers), marimba, hud, arcade and whisper. tools-src/sound/lab.html plays every moment of every kit, and a practice
 * round, from this file (README there).
 *
 * Sound on or off: SiteSound.on, SiteSound.setOn(on). On unless the visitor turned it off; the choice is saved in
 * their browser ("ss1.sound.on") and holds in every tool. A browser lets a page make sound only after a click or a
 * key press, so nothing plays before one, and a phone on silent stays silent.
 */
(function () {
	'use strict';
	var SAVED = 'ss1.sound.on';
	var AC = window.AudioContext || window.webkitAudioContext;
	var ctx = null, master = null, room = null, noiseBuf = null;
	var out = null;   // where a sound goes: master, or a moment's panner (play's { pan })
	var volume = 0.7;   // the level the kits were made at

	var on = true;
	try { on = JSON.parse(window.localStorage.getItem(SAVED)) !== false; } catch (e) {}

	// The one audio context, made (or woken) when it is first needed: a gentle limiter at the end, so many sounds at
	// once never clip, and a short room for the kits that want a little space round their notes.
	function audio() {
		if (!AC) return null;
		if (!ctx) {
			try {
				ctx = new AC();
				var comp = ctx.createDynamicsCompressor();
				comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
				master = ctx.createGain(); master.gain.value = volume;
				master.connect(comp); comp.connect(ctx.destination);
				room = ctx.createConvolver(); room.buffer = impulse(1.6, 3.4); room.connect(master);
				noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
				var d = noiseBuf.getChannelData(0);
				for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
			} catch (e) { ctx = null; return null; }
		}
		if (ctx.state === 'suspended' && on) {
			try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
		}
		return ctx;
	}
	// a room: two channels of noise dying away
	function impulse(sec, decay) {
		var len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
		for (var ch = 0; ch < 2; ch++) {
			var d = b.getChannelData(ch);
			for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
		}
		return b;
	}
	function route(node, send) {
		node.connect(out || master);
		if (send) { var s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(room); }
	}
	var mf = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };   // a MIDI note's frequency (69 = A4)
	var jitter = function (x, amt) { return x * (1 + (Math.random() - 0.5) * amt); };

	// One voice: an oscillator with a quick attack and a fade (f in Hz, t when, a attack, d fade, g loudness, send how
	// much goes to the room), optionally gliding to f2 and through a low- or high-pass filter.
	function tone(o) {
		var c = audio(); if (!c) return;
		var t0 = c.currentTime + 0.01 + (o.t || 0), a = o.a || 0.004, d = o.d || 0.3, g = o.g || 0.2;
		var osc = c.createOscillator(); osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(o.f, t0);
		if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.glide || d));
		var v = c.createGain();
		v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g, t0 + a); v.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
		var n = osc, fl;
		if (o.lp) { fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; fl.Q.value = o.q || 0.7; n.connect(fl); n = fl; }
		if (o.hp) { fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = o.hp; n.connect(fl); n = fl; }
		n.connect(v); route(v, o.send || 0);
		osc.start(t0); osc.stop(t0 + a + d + 0.05);
	}
	// Filtered noise: breath, wood, air (type and f the filter, sweeping to f2 over `sweep`)
	function noise(o) {
		var c = audio(); if (!c) return;
		var t0 = c.currentTime + 0.01 + (o.t || 0), a = o.a || 0.002, d = o.d || 0.1, g = o.g || 0.1;
		var s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
		var fl = c.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.Q.value = o.q || 1; fl.frequency.setValueAtTime(o.f || 1000, t0);
		if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + (o.sweep || a + d));
		var v = c.createGain();
		v.gain.setValueAtTime(0.0001, t0); v.gain.exponentialRampToValueAtTime(g, t0 + a); v.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
		s.connect(fl); fl.connect(v); route(v, o.send || 0);
		s.start(t0, Math.random() * 0.5); s.stop(t0 + a + d + 0.05);
	}
	// The streak ladder (the kits nothing uses yet; Glass plays one sound for every right answer, see GLASS): the major
	// scale, one step at a time (do re mi fa sol la ti do, and a second octave): every right answer in a row is the
	// very next note, with none skipped, up to the fifteenth, and the top note holds from there.
	var SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
	var rung = function (s, top) { return SCALE[Math.min(Math.max(s, 1) - 1, top == null ? 14 : top)]; };
	function arp(fn, notes, gap) {
		var rest = Array.prototype.slice.call(arguments, 3);
		notes.forEach(function (m, i) { fn.apply(null, [m, i * gap].concat(rest)); });
	}

	// The instruments. A glass bell: a sine with two quieter overtones at a bell's (not a string's) ratios, fading fast
	// at the top. A mallet: a bar's overtones and a tiny click of noise for the stick. A blip and a chip: filtered
	// square waves, the HUD's and the 8-bit kit's.
	function glassBell(m, t, g, d, send) {
		t = t || 0; g = g == null ? 0.16 : g; d = d || 0.85; send = send == null ? 0.32 : send;
		var f = mf(m);
		tone({ f: f, t: t, d: d, g: g, send: send });
		tone({ f: f * 2.76, t: t, d: d * 0.32, g: g * 0.2, send: send });
		tone({ f: f * 5.4, t: t, d: d * 0.1, g: g * 0.07, send: send });
	}
	function mallet(m, t, g, d) {
		t = t || 0; g = g == null ? 0.2 : g; d = d || 0.5;
		var f = mf(m);
		tone({ f: f, t: t, a: 0.002, d: d, g: g, send: 0.12 });
		tone({ f: f * 3.93, t: t, a: 0.001, d: d * 0.22, g: g * 0.28, send: 0.08 });
		tone({ f: f * 9.2, t: t, a: 0.001, d: 0.035, g: g * 0.1 });
		noise({ t: t, d: 0.012, g: g * 0.18, f: 2600, q: 0.8 });
	}
	// A fuller glass bell, for the sparkle over a run of right answers: the note with a body under it, an octave and a
	// twelfth over it, a second voice a hair sharp (a slow shimmer) and a tiny tick where it is struck.
	function chime(m, t, g, d, send) {
		var f = mf(m);
		tone({ f: f, t: t, d: d, g: g, send: send });
		tone({ f: f * 1.004, t: t, d: d * 0.85, g: g * 0.55, send: send });
		tone({ f: f * 2, t: t, d: d * 0.45, g: g * 0.3, send: send });
		tone({ f: f * 3.01, t: t, d: d * 0.24, g: g * 0.13, send: send });
		tone({ f: f * 0.5, type: 'triangle', t: t, a: 0.006, d: d * 0.5, g: g * 0.3, lp: 1100 });
		tone({ f: f * 5.4, t: t, d: 0.07, g: g * 0.07, send: send });
		noise({ t: t, d: 0.016, g: g * 0.4, f: 3400, q: 0.9 });
	}
	function blip(m, t, g, d, type) {
		tone({ f: mf(m), t: t || 0, a: 0.002, d: d || 0.07, g: g == null ? 0.05 : g, type: type || 'square', lp: 3200, send: 0.06 });
	}
	function chip(m, t, d, g, type) {
		tone({ f: mf(m), t: t || 0, a: 0.002, d: d || 0.08, g: g == null ? 0.055 : g, type: type || 'square', lp: 7000 });
	}
	// a little tune: [[note, length], …] one after another
	function melody(notes, g, type) {
		notes.reduce(function (t, n) { chip(n[0], t, n[1], g, type); return t + n[1] + 0.01; }, 0);
	}

	// Glass: wood for an answer, glass for everything round it. A right answer is two notes on a wooden bar, low then
	// high (a fifth apart), and it is the same every time: a sound heard two hundred times in a round has to be one
	// that is good to hear two hundred times, and a note that climbed with the streak was not. The streak is heard as
	// a glass sparkle over every fifth right answer in a row, and a bigger one over every tenth. Clicking the one that
	// was missed, and "show me", are single softer wooden notes. The end of a round, a best, a clue and the view
	// changing stay small glass bells in a quiet room.
	// (g: how loud, 1 = a right answer. The level is set a little above the bell it took the place of, so the miss,
	// the end of a round and the rest keep their place beside it.)
	function yes(g) { mallet(72, 0, 0.11 * g, 0.3); mallet(79, 0.09, 0.13 * g, 0.55); }
	function sparkle(s) {
		if (s % 10 === 0) { chime(91, 0.22, 0.04, 0.7, 0.45); chime(96, 0.29, 0.032, 0.9, 0.5); }
		else if (s % 5 === 0) chime(91, 0.22, 0.036, 0.7, 0.45);
	}
	var GLASS = {
		id: 'glass', name: 'Glass',
		correct: function (s) { yes(1); sparkle(s); },
		wrong: function () { tone({ f: mf(64), f2: mf(59), type: 'triangle', d: 0.22, g: 0.11, lp: 1400, glide: 0.16, send: 0.12 }); tone({ f: mf(40), d: 0.14, g: 0.07 }); },
		found: function () { mallet(76, 0, 0.15, 0.4); },
		skip: function () { mallet(67, 0, 0.08, 0.3); },
		finish: function (grade) {
			if (grade === 'perfect') { arp(glassBell, [72, 76, 79, 84], 0.07, 0.12, 0.8); [84, 88, 91].forEach(function (m) { glassBell(m, 0.33, 0.07, 1.4, 0.45); }); }
			else if (grade === 'good') { arp(glassBell, [72, 76, 79], 0.08, 0.12, 0.8); [79, 84].forEach(function (m) { glassBell(m, 0.28, 0.07, 1.1, 0.4); }); }
			else { glassBell(67, 0, 0.1, 0.7); glassBell(72, 0.14, 0.1, 1.0); }
		},
		best: function () {
			arp(function (m, t) { glassBell(m, t, 0.045, 0.5, 0.5); }, [84, 86, 88, 91, 93, 96, 98, 100], 0.035);
			[84, 91, 96].forEach(function (m) { glassBell(m, 0.32, 0.06, 1.6, 0.55); });
		},
		key: function () { tone({ f: jitter(3200, 0.06), d: 0.022, a: 0.001, g: 0.022 }); },
		hint: function () { glassBell(91, 0, 0.06, 0.5); glassBell(96, 0.07, 0.05, 0.5); },
		named: function () { yes(1); },
		mode: function () { glassBell(88, 0, 0.06, 0.4, 0.2); glassBell(93, 0.06, 0.06, 0.45, 0.2); },
		xrayOn: function () { noise({ f: 500, f2: 5000, q: 2, a: 0.14, d: 0.3, g: 0.08, send: 0.3 }); glassBell(96, 0.22, 0.03, 0.5, 0.4); },
		xrayOff: function () { noise({ f: 5000, f2: 500, q: 2, a: 0.08, d: 0.3, g: 0.07, send: 0.25 }); },
		layer: function () { arp(function (m, t) { glassBell(m, t, 0.05, 0.4, 0.25); }, [91, 88, 84], 0.06); },
		zoom: function () { noise({ f: 300, f2: 1400, q: 1.2, a: 0.12, d: 0.3, g: 0.08, send: 0.2 }); },
	};
	// Glass for the geography tools' rounds of a hundred quick answers: a right answer is the same two wooden notes (short
	// enough that answers a second apart don't pile up), a misspelled right answer is the two notes played softer, and
	// typing makes no sound.
	var GLASS_QUICK = Object.assign({}, GLASS, {
		id: 'glass-quick', name: 'Glass, quick',
		close: function () { yes(0.6); },
		key: null, hint: null, named: null,
	});

	var KITS = [
		GLASS,
		GLASS_QUICK,
		{
			id: 'marimba', name: 'Marimba',   // wooden mallets and wood-block clicks: warm, round, a little playful
			correct: function (s) { var m = 67 + rung(s); mallet(m); if (s % 5 === 0) mallet(m + 12, 0.06, 0.1, 0.4); },
			wrong: function () { noise({ f: 380, q: 5, d: 0.09, g: 0.22 }); tone({ f: 150, f2: 112, d: 0.12, g: 0.1 }); },
			found: function () { mallet(64, 0, 0.15); },
			skip: function () { mallet(55, 0, 0.08, 0.3); },
			finish: function (grade) {
				if (grade === 'perfect') { arp(mallet, [67, 71, 74, 79, 83, 86], 0.06, 0.14); [79, 83, 86].forEach(function (m) { mallet(m, 0.42, 0.1, 0.9); }); }
				else if (grade === 'good') { arp(mallet, [67, 71, 74, 79], 0.07, 0.14); [74, 79].forEach(function (m) { mallet(m, 0.34, 0.1, 0.8); }); }
				else { mallet(62, 0, 0.13, 0.5); mallet(67, 0.15, 0.13, 0.7); }
			},
			best: function () {
				arp(function (m, t) { mallet(m, t, 0.08, 0.3); }, [72, 74, 76, 79, 81, 84, 86, 88, 91], 0.04);
				[79, 84, 88].forEach(function (m) { mallet(m, 0.42, 0.1, 1.0); });
			},
			key: function () { noise({ f: jitter(2600, 0.08), q: 3, d: 0.014, g: 0.07 }); },
			hint: function () { mallet(84, 0, 0.07, 0.3); mallet(91, 0.06, 0.06, 0.3); },
			named: function () { mallet(79, 0, 0.16); mallet(86, 0.05, 0.12); },
			mode: function () { mallet(72, 0, 0.08, 0.3); mallet(79, 0.05, 0.08, 0.3); },
			xrayOn: function () { noise({ f: 3000, f2: 6500, q: 1.5, a: 0.16, d: 0.22, g: 0.06 }); },
			xrayOff: function () { noise({ f: 6500, f2: 3000, q: 1.5, a: 0.06, d: 0.24, g: 0.05 }); },
			layer: function () { arp(function (m, t) { mallet(m, t, 0.08, 0.3); }, [79, 76, 72], 0.06); },
			zoom: function () { noise({ type: 'lowpass', f: 600, f2: 1500, q: 1, a: 0.1, d: 0.28, g: 0.08 }); },
		},
		{
			id: 'hud', name: 'HUD',   // scanner blips and sweeps, like a heads-up display reading the body
			correct: function (s) {
				var m = 76 + rung(s, 7);
				blip(m); blip(m + 7, 0.055, 0.05, 0.1); tone({ f: mf(m + 7), t: 0.055, d: 0.22, g: 0.05, send: 0.1 });
				if (s % 5 === 0) tone({ f: mf(m + 19), t: 0.12, d: 0.4, g: 0.035, send: 0.25 });
			},
			wrong: function () { tone({ f: 150, f2: 110, type: 'sawtooth', d: 0.1, g: 0.06, lp: 700, glide: 0.09 }); tone({ f: 150, f2: 110, type: 'sawtooth', t: 0.13, d: 0.12, g: 0.05, lp: 600 }); },
			found: function () { blip(76); tone({ f: mf(83), t: 0.05, d: 0.2, g: 0.05, send: 0.1 }); },
			skip: function () { blip(69, 0, 0.035, 0.05); },
			finish: function (grade) {
				if (grade === 'perfect') { arp(blip, [69, 72, 76, 79, 81, 84], 0.045, 0.045, 0.06); [81, 88].forEach(function (m) { tone({ f: mf(m), t: 0.3, d: 0.9, g: 0.05, send: 0.25 }); }); }
				else if (grade === 'good') { arp(blip, [69, 72, 76, 81], 0.05, 0.045, 0.06); tone({ f: mf(81), t: 0.24, d: 0.7, g: 0.05, send: 0.2 }); }
				else { blip(72, 0, 0.04, 0.08); blip(69, 0.1, 0.04, 0.08); tone({ f: mf(69), t: 0.2, d: 0.5, g: 0.04, send: 0.15 }); }
			},
			best: function () {
				tone({ f: 200, f2: 1600, type: 'sawtooth', d: 0.45, g: 0.04, lp: 2600, glide: 0.42 });
				[81, 85, 88, 93].forEach(function (m) { tone({ f: mf(m), t: 0.42, d: 1.1, g: 0.035, send: 0.3 }); });
			},
			key: function () { tone({ f: jitter(2400, 0.08), type: 'square', d: 0.01, a: 0.001, g: 0.016, lp: 5000 }); },
			hint: function () { tone({ f: 1200, f2: 2400, d: 0.08, g: 0.045, glide: 0.07 }); },
			named: function () { blip(81); blip(88, 0.05); tone({ f: mf(93), t: 0.1, d: 0.3, g: 0.045, send: 0.12 }); },
			mode: function () { blip(76, 0, 0.04); blip(83, 0.05, 0.04); },
			xrayOn: function () { tone({ f: 300, f2: 2400, type: 'sawtooth', d: 0.32, g: 0.035, lp: 1800, glide: 0.3 }); noise({ type: 'highpass', f: 6000, t: 0.25, d: 0.08, g: 0.03 }); },
			xrayOff: function () { tone({ f: 2400, f2: 300, type: 'sawtooth', d: 0.28, g: 0.03, lp: 1800, glide: 0.26 }); },
			layer: function () { [[2000, 800], [1600, 600], [1200, 420]].forEach(function (p, i) { tone({ f: p[0], f2: p[1], t: i * 0.065, d: 0.06, g: 0.035, glide: 0.055 }); }); },
			zoom: function () { noise({ type: 'lowpass', f: 400, f2: 2200, q: 6, a: 0.12, d: 0.24, g: 0.06 }); },
		},
		{
			id: 'arcade', name: 'Arcade',   // eight-bit coins and power-ups: the most game-like
			correct: function (s) { var k = rung(s, 7); chip(83 + k, 0, 0.06); chip(88 + k, 0.065, 0.24); },
			wrong: function () { chip(57, 0, 0.08, 0.04, 'triangle'); chip(52, 0.09, 0.16, 0.045, 'triangle'); },
			found: function () { arp(function (m, t) { chip(m, t, 0.06, 0.045); }, [76, 81, 88], 0.06); },
			skip: function () { chip(64, 0, 0.05, 0.03); },
			finish: function (grade) {
				if (grade === 'perfect') melody([[72, .08], [76, .08], [79, .08], [84, .16], [79, .08], [84, .4]], 0.05);
				else if (grade === 'good') melody([[72, .08], [76, .08], [79, .08], [84, .32]], 0.05);
				else melody([[72, .1], [67, .1], [72, .3]], 0.045, 'triangle');
			},
			best: function () { for (var i = 0; i < 12; i++) chip(60 + i * 2, i * 0.03, 0.05, 0.04); chip(84, 0.38, 0.35, 0.05); chip(88, 0.38, 0.35, 0.035, 'triangle'); },
			key: function () { tone({ f: jitter(1800, 0.06), type: 'triangle', d: 0.015, a: 0.001, g: 0.035 }); },
			hint: function () { chip(88, 0, 0.05, 0.04); chip(93, 0.06, 0.08, 0.04); },
			named: function () { chip(83, 0, 0.06); chip(88, 0.065, 0.16); chip(95, 0.24, 0.14, 0.04); },
			mode: function () { chip(79, 0, 0.05, 0.04); chip(86, 0.055, 0.08, 0.04); },
			xrayOn: function () { tone({ type: 'square', f: mf(60), f2: mf(84), d: 0.24, g: 0.03, lp: 6000, glide: 0.22 }); },
			xrayOff: function () { tone({ type: 'square', f: mf(84), f2: mf(60), d: 0.24, g: 0.03, lp: 6000, glide: 0.22 }); },
			layer: function () { arp(function (m, t) { chip(m, t, 0.05, 0.04); }, [84, 79, 72], 0.06); },
			zoom: function () { noise({ type: 'lowpass', f: 2200, f2: 900, q: 0.7, d: 0.2, g: 0.05 }); },
		},
		{
			id: 'whisper', name: 'Whisper',   // barely there: soft tones for answers, tiny clicks, silence for the rest
			correct: function (s) { tone({ f: mf(76 + rung(s, 7)), d: 0.2, g: 0.05, send: 0.2 }); },
			wrong: function () { tone({ f: mf(57), d: 0.16, g: 0.04, lp: 900 }); },
			found: function () { tone({ f: mf(72), d: 0.18, g: 0.04, send: 0.15 }); },
			finish: function (grade) {
				tone({ f: mf(76), d: 0.3, g: 0.045, send: 0.2 }); tone({ f: mf(83), t: 0.1, d: 0.5, g: 0.04, send: 0.25 });
				if (grade === 'perfect') tone({ f: mf(88), t: 0.2, d: 0.7, g: 0.035, send: 0.3 });
			},
			best: function () { [84, 88, 91].forEach(function (m, i) { tone({ f: mf(m), t: i * 0.08, d: 0.6, g: 0.03, send: 0.35 }); }); },
			key: function () { noise({ type: 'highpass', f: 3000, d: 0.006, g: 0.02 }); },
			hint: function () { tone({ f: mf(88), d: 0.2, g: 0.03, send: 0.2 }); },
			named: function () { tone({ f: mf(79), d: 0.2, g: 0.045, send: 0.2 }); tone({ f: mf(86), t: 0.07, d: 0.3, g: 0.035, send: 0.25 }); },
		},
	];

	// A kit for a tool: play(moment, arg, { pan }) plays a moment if sound is on and the kit has it, from the left (-1)
	// to the right (1) when pan is given (the room it rings in stays in the middle). The same moment twice within 25 ms
	// (a key held down, two events from one click) plays once.
	var last = {};
	function kit(id) {
		var k = KITS.filter(function (x) { return x.id === id; })[0] || KITS[0];
		return {
			id: k.id,
			play: function (moment, arg, opts) {
				if (!on || typeof k[moment] !== 'function') return;
				var now = Date.now();
				if (now - (last[moment] || 0) < 25) return;
				last[moment] = now;
				var c = audio(); if (!c) return;
				var pan = opts && opts.pan;
				if (pan && c.createStereoPanner) {
					out = c.createStereoPanner(); out.pan.value = Math.max(-1, Math.min(1, pan)); out.connect(master);
				}
				try { k[moment](arg); } catch (e) {}
				out = null;
			},
		};
	}

	function setOn(value) {
		on = !!value;
		try { window.localStorage.setItem(SAVED, JSON.stringify(on)); } catch (e) {}
		if (!ctx) return;
		try { var p = on ? ctx.resume() : ctx.suspend(); if (p && p.catch) p.catch(function () {}); } catch (e) {}   // (off: what is still ringing stops)
	}

	// Wake the audio on the first click, tap or key press, so the first sound a visitor makes is heard in full.
	// (Kept listening: a phone can put the audio back to sleep when the page is in the background.)
	['pointerdown', 'touchend', 'click', 'keydown'].forEach(function (type) {
		window.addEventListener(type, function () { if (on && (!ctx || ctx.state !== 'running')) audio(); }, { capture: true, passive: true });
	});

	window.SiteSound = {
		kit: kit,
		kits: KITS,   // (for tools-src/sound/lab.html, which plays them directly)
		get on() { return on; },
		setOn: setOn,
		setVolume: function (v) { volume = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02); },
		unlock: audio,
	};
})();
