// @ts-check
/* The shell's behaviour, for every tool that isn't on the atlas engine or World Capitals' page (the trainers, and every
 * new tool): the same pieces, working the same way, as in the atlases. The look is shell.css; the words are text.js
 * (English) and lang/<code>.json, one more layer for the language module. (Everything stays in the visitor's browser.)
 *
 * In a tool's code:
 *
 *   import { layer as shellText, startShell } from '../shell/shell.js';
 *   const lang = await SiteLanguage.open({ layers: [{ text: EN, files: new URL('lang/', import.meta.url) }, shellText] });
 *   const ui = startShell({
 *     lang, store,                          // the language (lang.t) and the tool's saved data (SiteProgress.tool(id))
 *     sound: 'glass-quick',                 // the tool's kit in /js/sound.js (ui.sound.play('correct', streak)…)
 *     help: (what) => [[name, text, now]],  // what the "i" beside a row says: data-help="what" on the button. Each part
 *                                           // is a name and what it does, the one in use (now) marked; or one text
 *     keys: () => ['<kbd>H</kbd> hit', …],  // the Keys window's rows, for what is on the screen (the M row is added)
 *     toast: (text) => …,                   // how the tool says a short thing (the sound switched with M)
 *     prefs: [{ title, get, set }],         // (optional) the tool's own On / Off rows in Preferences: what is set once
 *   });
 *   document.addEventListener('keydown', (e) => { if (ui.key(e)) return; … the tool's own keys … });
 *
 * In the page: the settings rows with <div class="sec-h"><h3>…</h3><button class="help" type="button" data-help="mode"
 * aria-label="What this does" data-i18n-aria="shell.help_aria">i</button></div>, and at their foot
 * <div class="panel-foot"> with #prefsBtn and #keysBtn (class="linkbtn"). The windows themselves (Preferences, Keys,
 * the first-visit card) are made here. ui.start({ name, lines, pick }) shows the first-visit card; ui.result({…})
 * puts a round's result in the name's place (#prompt) and ui.clearResult() takes it away; ui.statsOff(true) greys the
 * score out (Explore, and while a result shows). Esc: ui.key closes an explanation or a window; the tool's own Esc
 * steps come after it (a phone's sheet, the selection, clean view). The decisions are in claude/atlas-ui-plan.md. */
import { EN } from './text.js';

/** The shell's words, as a layer for SiteLanguage.open: put it after the tool's own */
export const layer = { text: EN, files: new URL('lang/', import.meta.url) };

/**
 * A small element, for the shell and every tool on it: h('button', { class: 'btn', text: 'Next', onclick: go }, kids).
 * class, text, html and style set those; on<event> adds a listener; true is an empty attribute (hidden, disabled);
 * null, undefined and false leave the attribute out. kids: one child or a list (falsy ones skipped).
 * @param {string} tag @param {Record<string, any> | null} [attrs] @param {any} [kids]
 * @returns {any}
 */
export function h(tag, attrs, kids) {
	const el = document.createElement(tag);
	for (const k in attrs || {}) {
		const v = attrs[k];
		if (v == null || v === false) continue;
		if (k === 'class') el.className = v;
		else if (k === 'text') el.textContent = v;
		else if (k === 'html') el.innerHTML = v;
		else if (k === 'style') el.style.cssText = v;
		else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
		else el.setAttribute(k, v === true ? '' : v);
	}
	for (const kid of [].concat(kids || [])) if (kid) el.append(kid);
	return el;
}

export function startShell(opts) {
	const { lang } = opts;
	const t = (k, v) => lang.t(k, v);
	const $ = (id) => document.getElementById(id);
	const shared = window.SiteProgress ? SiteProgress.tool('atlas-engine') : { get: (k, d) => d, set: () => {} };   // (the name card's size: one setting for every tool, as in the atlases)
	const sound = window.SiteSound && opts.sound !== false ? SiteSound.kit(opts.sound || 'glass-quick') : { play() {} };
	const narrow = () => window.matchMedia('(max-width: 900px)').matches;

	/* ---------------- "i": what a row does ---------------- */
	// The words that would stand under a row are behind its "i": a small box that floats by the button, so no panel
	// changes height. Each part is a name and what it does; the one in use is marked.
	const helpBox = h('div', { class: 'helpbox', role: 'tooltip' }); helpBox.hidden = true; document.body.append(helpBox);
	let helpFor = null;
	const parts = (what) => {
		const p = opts.help ? opts.help(what) : null;
		if (!p) return [];
		return (typeof p === 'string' ? [[null, p]] : p).filter((x) => x && x[1]);
	};
	function closeHelp() { if (!helpFor) return false; helpFor.setAttribute('aria-expanded', 'false'); helpFor = null; helpBox.hidden = true; return true; }
	function openHelp(btn) {
		const list = parts(btn.dataset.help);
		closeHelp(); if (!list.length) return;
		helpBox.replaceChildren(...list.map(([name, text, now]) => {
			const p = h('p'); if (name) p.append(h('b', { text: name }));
			p.append(document.createRange().createContextualFragment(text)); p.classList.toggle('now', !!now); return p;
		}));
		helpBox.hidden = false; helpFor = btn; btn.setAttribute('aria-expanded', 'true');
		// Where: beside the panel the button is in, level with the button, so it covers nothing it explains; where
		// there is no room beside it (a phone), above the button, or under it. Kept on the screen.
		const r = btn.getBoundingClientRect(), w = helpBox.offsetWidth, boxH = helpBox.offsetHeight, W = window.innerWidth, H = window.innerHeight;
		const pop = !narrow() && btn.closest('.panel, .rail'), pr = pop && pop.getBoundingClientRect();
		let left, top;
		if (pr && pr.left - w - 8 >= 12 && pop.matches('.panel')) { left = pr.left - w - 8; top = Math.min(H - boxH - 12, Math.max(12, r.top - 10)); }
		else if (pr && pr.right + 8 + w <= W - 12) { left = pr.right + 8; top = Math.min(H - boxH - 12, Math.max(12, r.top - 10)); }
		else { left = Math.max(12, Math.min(W - w - 12, r.right - w)); top = r.top - 8 - boxH >= 12 ? r.top - 8 - boxH : Math.min(H - boxH - 12, r.bottom + 8); }
		helpBox.style.left = left + 'px'; helpBox.style.top = top + 'px';
	}
	document.addEventListener('click', (e) => {
		const btn = e.target.closest && e.target.closest('.help');
		if (btn) { if (helpFor === btn) closeHelp(); else openHelp(btn); }
		else if (helpFor && !helpBox.contains(/** @type {Node} */ (e.target))) closeHelp();
	});
	window.addEventListener('resize', closeHelp);
	// (an "i" with nothing to say is hidden)
	const refreshHelp = () => document.querySelectorAll('.help').forEach((b) => { b.hidden = !parts(b.dataset.help).length; });

	/* ---------------- the windows: Preferences, Keys, the first-visit card ---------------- */
	const head = (id, titleKey) => h('div', { class: 'dlg-head' }, [h('h2', { id: id + 'Title', 'data-k': titleKey }), h('button', { class: 'card-x', id: id + 'Close', type: 'button', 'data-k-aria': 'shell.close' }, '×')]);
	function overlay(id, kids, cls = '') {
		const o = h('div', { class: 'overlay', id, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + 'Title' }, h('div', { class: 'card dlg ' + cls }, kids));
		o.hidden = true; document.body.append(o);
		o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('.card-x')) dialog(null); });
		return o;
	}
	// Preferences: set once, kept in this browser. The name card's size holds for every tool (the atlases' too), the
	// sound for every tool on the site.
	const seg = (id, items) => h('div', { class: 'seg', id }, items.map(([v, k]) => h('button', { type: 'button', 'data-v': v, 'data-k': k })));
	const prefs = overlay('prefs', [
		head('prefs', 'shell.prefs'),
		h('section', {}, [h('h3', { 'data-k': 'shell.card_title' }), h('label', { class: 'card-row' }, [h('span', { 'data-k': 'shell.card_size' }), h('input', { id: 'cardSize', type: 'range', min: '60', max: '200', step: '5', value: '100' }), h('output', { id: 'cardSizeOut', text: '100%' })])]),
		h('section', { id: 'soundBox' }, [h('div', { class: 'card-row' }, [h('span', { 'data-k': 'shell.sound' }), seg('soundSeg', [['on', 'shell.on'], ['off', 'shell.off']])])]),
	]);
	// the tool's own rows (set once, On / Off), under the sound
	(opts.prefs || []).forEach((row, i) => {
		const sec = h('section', {}, [h('div', { class: 'card-row' }, [h('span', { 'data-pref-title': String(i) }), seg('pref' + i, [['on', 'shell.on'], ['off', 'shell.off']])])]);
		prefs.querySelector('.card').append(sec);
		sec.querySelector('.seg').addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.v; if (v) { row.set(v === 'on'); renderPrefs(); } });
	});
	// (a tool with no name card has no size to set)
	if (!document.querySelector('.pname')) prefs.querySelector('section').hidden = true;
	const keysWin = overlay('keys', [head('keys', 'shell.keys'), h('ul', { class: 'keys-list', id: 'keysList' })]);
	const startWin = overlay('start', [
		h('div', { class: 'dlg-head' }, [h('div', { class: 'eyebrow', id: 'startName' }), h('button', { class: 'card-x', id: 'startClose', type: 'button', 'data-k-aria': 'shell.close' }, '×')]),
		h('h2', { id: 'startTitle', 'data-k': 'shell.start_q' }),
		h('div', { class: 'start-modes', id: 'startModes' }, ['study', 'practice', 'test'].map((m) => h('button', { type: 'button', 'data-mode': m }, [h('b', { 'data-k': 'shell.mode_' + m }), h('span')]))),
		h('p', { class: 'hint', 'data-k': 'shell.start_foot' }),
	], 'start');
	startWin.setAttribute('aria-labelledby', 'startTitle');
	$('soundBox').hidden = !window.SiteSound;
	let open = null, startOpts = null;
	function dialog(id) {
		if (open) $(open).hidden = true;
		open = id || null;
		if (!open) return;
		closeHelp();
		if (open === 'keys') renderKeys();
		renderPrefs();
		$(open).hidden = false;
		($(open).querySelector('.start-modes button') || $(open).querySelector('.card-x')).focus({ preventScroll: true });
	}
	function renderKeys() {
		const rows = (opts.keys ? opts.keys() : []).concat(window.SiteSound ? [t('shell.key_sound')] : []);
		$('keysList').replaceChildren(...rows.join(' · ').split(' · ').filter(Boolean).map((html) => h('li', { html })));
	}
	function renderPrefs() {
		$('soundSeg').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === (soundOn() ? 'on' : 'off'))));
		(opts.prefs || []).forEach((row, i) => {
			prefs.querySelector(`[data-pref-title="${i}"]`).textContent = row.title();
			$('pref' + i).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === (row.get() ? 'on' : 'off'))));
		});
	}
	// (the buttons may be drawn again by the tool: listened for on the page)
	document.addEventListener('click', (e) => {
		const b = e.target.closest && e.target.closest('#prefsBtn, #keysBtn');
		if (b) dialog(b.id === 'prefsBtn' ? 'prefs' : 'keys');
	});
	startWin.querySelector('#startModes').addEventListener('click', (e) => {
		const b = e.target.closest('button[data-mode]'); if (!b) return;
		dialog(null);
		if (startOpts && startOpts.pick) startOpts.pick(b.dataset.mode);
	});

	// The name card's size (Preferences): the name and its small print grow with it, the small print half as fast, as in
	// the atlases (the same setting). On a big window it grows with the window too; on a phone the slider does half.
	const card = { scale: +shared.get('cardScale', 1) || 1 };
	function applyCard() {
		const wide = window.innerWidth > 900;
		const fits = wide ? Math.min(2, Math.max(1, Math.min(window.innerHeight / 900, window.innerWidth / 1440))) : 1;
		const scale = wide ? fits * card.scale : 1 + (card.scale - 1) * 0.5;
		document.body.style.setProperty('--card-scale', scale.toFixed(3));
	}
	const range = $('cardSize'), pct = $('cardSizeOut');
	range.value = Math.round(card.scale * 100); pct.textContent = range.value + '%';
	range.addEventListener('input', () => { card.scale = range.value / 100; shared.set('cardScale', card.scale); pct.textContent = range.value + '%'; applyCard(); });
	window.addEventListener('resize', applyCard);
	applyCard();

	// The Sound switch (and M): on or off for every tool on the site (/js/sound.js). Turned on, it says so.
	function soundOn() { return !!window.SiteSound && SiteSound.on; }
	function setSound(on, say) {
		if (!window.SiteSound || on === SiteSound.on) return;
		SiteSound.setOn(on);
		if (on) sound.play('mode');
		renderPrefs();
		if (say && opts.toast) opts.toast(`${t('shell.sound')}: ${t(on ? 'shell.on' : 'shell.off')}`);
	}
	$('soundSeg').addEventListener('click', (e) => { const v = e.target.closest('button')?.dataset.v; if (v) setSound(v === 'on'); });

	/* ---------------- the result of a round, in the name's place ---------------- */
	// The score, big; the time, the accuracy and the longest streak in three boxes beside it; a New best pill; Go again,
	// with Practise the misses beside it when there are any; the key to the colours. While it shows, the name's own
	// lines make way (.prompt.is-review), and the score boxes at the top are off (on a phone they go: body.reviewing).
	function clearResult() {
		const p = $('prompt'); if (!p) return;
		p.classList.remove('is-review');
		p.querySelector(':scope > .review')?.remove(); p.querySelector(':scope > .pill')?.remove();
		document.body.classList.remove('reviewing');
		// (the score boxes back as the tool last asked: greyed out in Explore)
		$('stats')?.classList.toggle('is-off', statsWanted);
	}
	let statsWanted = false;   // the tool's own ui.statsOff(): kept, so taking a result away doesn't undo it
	function result(r) {
		clearResult();
		const p = $('prompt');
		const tile = (v, k) => h('div', {}, [h('b', { text: v }), h('span', { text: t(k) })]);
		const again = h('button', { class: 'btn primary', type: 'button', id: 'rAgain', text: r.againLabel || t('shell.go_again') });
		again.addEventListener('click', () => r.again && r.again());
		const actions = h('div', { class: 'res-actions' }, [again]);
		if (r.misses) {
			const m = h('button', { class: 'btn', type: 'button', id: 'rPractice', text: r.missesLabel || t('shell.practise_misses') });
			m.addEventListener('click', () => r.misses()); actions.append(m);
		}
		const key = (cls, n, word) => h('span', { class: 'key ' + cls }, [h('i'), h('b', { text: String(n) }), ' ', h('span', { text: word })]);
		const foot = h('div', { class: 'res-foot' }, [
			r.ok != null ? key('ok', r.ok, t('shell.correct', { n: r.ok })) : null,
			r.bad != null ? key('bad', r.bad, t('shell.missed', { n: r.bad })) : null,
			r.hint ? h('span', { class: 'rhint', html: r.hint }) : null,
		]);
		const box = h('div', { class: 'review', id: 'review' }, [
			h('div', { class: 'res-main' }, [
				h('div', { class: 'res-score' }, [h('b', { id: 'rScore', text: String(r.score) }), r.total != null ? h('span', { id: 'rTotal', text: '/ ' + r.total }) : null]),
				h('div', { class: 'res-tiles' }, [tile(r.time, 'shell.time'), tile(r.acc, 'shell.acc'), tile(String(r.streak ?? 0), 'shell.streak')]),
			]),
			actions,
			foot.childNodes.length ? foot : null,
		]);
		if (r.eyebrow != null) p.querySelector('.eyebrow').textContent = r.eyebrow;
		p.classList.remove('is-ok', 'is-bad');
		p.classList.add('is-review');
		if (r.best) p.append(h('span', { class: 'pill', id: 'rBest', text: t('shell.new_best') }));
		p.append(box);
		document.body.classList.add('reviewing');
		$('stats')?.classList.add('is-off');
		sound.play('finish', !r.bad && r.score === r.total ? 'perfect' : r.total && r.score / r.total >= 2 / 3 ? 'good' : 'rough');
		if (r.best) setTimeout(() => sound.play('best'), 450);
	}

	/* ---------------- the brand fits its column ---------------- */
	// The tool's name is 20px, as in every tool, where it fits beside the middle column; where a tool's middle column
	// is wide (a card table, a board) and the window narrow, the name is drawn a little smaller rather than run under
	// the name card. (On a phone it has the top row to itself.)
	function fitBrand() {
		const mark = document.querySelector('.brand .mark'); if (!mark) return;
		mark.style.fontSize = '';
		if (narrow()) return;
		const mid = document.querySelector('.centre, .prompt'), m = mid && mid.getBoundingClientRect(), b = mark.getBoundingClientRect();
		if (!m || !m.width) return;
		const rtl = document.documentElement.dir === 'rtl';
		const room = (rtl ? b.right - m.right : m.left - b.left) - 14, need = mark.scrollWidth;
		if (need > room) mark.style.fontSize = Math.max(13, Math.floor(parseFloat(getComputedStyle(mark).fontSize) * room / need * 10) / 10) + 'px';
	}
	window.addEventListener('resize', fitBrand);
	document.fonts && document.fonts.ready.then(fitBrand);

	/* ---------------- words ---------------- */
	function render() {
		document.querySelectorAll('#prefs [data-k], #keys [data-k], #start [data-k]').forEach((e) => { e.textContent = t(e.dataset.k); });
		document.querySelectorAll('#prefs [data-k-aria], #keys [data-k-aria], #start [data-k-aria]').forEach((e) => e.setAttribute('aria-label', t(e.dataset.kAria)));
		renderPrefs();
		if (startOpts) fillStart();
		if (open === 'keys') renderKeys();
		refreshHelp();
		closeHelp();
		fitBrand();
	}
	function fillStart() {
		$('startName').textContent = startOpts.name || '';
		const lines = typeof startOpts.lines === 'function' ? startOpts.lines() : startOpts.lines || {};
		startWin.querySelectorAll('#startModes button').forEach((b) => { b.querySelector('span').innerHTML = lines[b.dataset.mode] || ''; });
	}
	lang.onChange(render);
	render();

	/* ---------------- keys ---------------- */
	// Esc closes what is open, one step at a time (an explanation, then a window); the tool's own steps come after.
	// ? opens the Keys window, M switches the sound. While a window is open the tool's keys wait.
	function key(e) {
		if (e.metaKey || e.ctrlKey || e.altKey) return false;
		const tag = (e.target.tagName || '').toLowerCase();
		if (e.key === 'Escape') { if (closeHelp()) { e.preventDefault(); return true; } if (open) { e.preventDefault(); dialog(null); return true; } return false; }
		if (open) { if (e.key !== 'Tab' && !(tag === 'input' || tag === 'button')) { if (e.key === '?' && open !== 'keys') dialog('keys'); } return e.key !== 'Tab' && tag !== 'input' && !(tag === 'button' && (e.key === 'Enter' || e.key === ' ')); }
		if (tag === 'input' || tag === 'select' || tag === 'textarea') return false;
		if (e.key === '?' && !narrow()) { e.preventDefault(); dialog('keys'); return true; }
		if (e.key === 'm' || e.key === 'M') { setSound(!soundOn(), true); return true; }
		return false;
	}

	return {
		sound,
		key,
		dialog,
		isOpen: () => !!open || !!helpFor,
		closeHelp,
		refresh: () => { refreshHelp(); if (open === 'keys') renderKeys(); },
		start(s) { startOpts = s; fillStart(); dialog('start'); },
		result,
		clearResult,
		statsOff: (off) => { statsWanted = !!off; $('stats')?.classList.toggle('is-off', statsWanted || document.body.classList.contains('reviewing')); },
	};
}
