// @ts-check
/* __NAME__: the page. What the tool knows is in core/ (no page code, unit-tested); every word it shows is in text.js;
 * the screen around the subject is the shell every tool shares (../../shell/: the settings rows and their "i",
 * Preferences, Keys, the first-visit card, a test's result in the name's place, the sounds). Progress is saved in the
 * visitor's browser through /js/progress.js, under this tool's folder name. Made by `npm run new-tool` (the tool kit): replace the
 * placeholder subject (core/round.js) and keep the rules in AGENTS.md ("Every other tool's screen"). */
import { EN, t, useLanguage } from './text.js';
import { h, layer as shellText, startShell } from '../../shell/shell.js';
import { ITEMS, makeRound, choicesFor, afterAnswer } from './core/round.js';

// its own words, then the shell's (Explore, Learn, Test, Preferences, Go again…)
const lang = await SiteLanguage.open({ layers: [{ text: EN, files: new URL('../lang/', import.meta.url) }, shellText] });
useLanguage(lang);

const $ = (id) => document.getElementById(id);
const saved = SiteProgress.tool('__ID__');
// what is set in the panel (saved), and what a visitor has learned: ids answered right in Learn or a test
const S = { mode: saved.get('mode', 'study'), size: saved.get('size', '10') };
const known = new Set(saved.get('known', []));
/** @type {any} */
let ui = null; // the shell: made at the end, once everything it asks about exists
/** @type {null | { queue: any[], asked: number, right: number, streak: number, longest: number, started: number, answered: boolean, misses: any[] }} */
let session = null;
let look = 0; // Explore: the item shown
let tick = 0;

const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms / 1000) % 60)).padStart(2, '0')}`;

/* ---------- the name card, the score, the panel ---------- */
function prompt(eyebrow, name, meta = '') {
	$('pEyebrow').textContent = eyebrow;
	$('pName').textContent = name;
	$('pMeta').textContent = meta || ' ';
}
function showStats() {
	const s = session;
	$('sAcc').textContent = s && s.asked ? `${Math.round((100 * s.right) / s.asked)}%` : '–';
	$('sTime').textContent = s && S.mode === 'test' ? clock(Date.now() - s.started) : '0:00';
	$('sStreak').textContent = String(s ? s.streak : 0);
}
/** The list down the left: the shell's list rows (class "rg", as every trainer's), each with its count; a set all known is
 * ticked (em class "done"). A tool with several sets makes one row each, and on a phone (one scrolling row) brings the
 * picked one into view. */
function fillRail() {
	$('railList').replaceChildren(h('button', { class: 'rg', type: 'button', 'aria-pressed': 'true' }, [
		h('span', { text: t('set_all') }), h('em', { class: known.size === ITEMS.length ? 'done' : '', text: `${known.size}/${ITEMS.length}` }),
	]));
}
function fillPanel() {
	for (const b of $('modeSeg').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === S.mode));
	for (const b of $('sizeSeg').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === S.size));
	// a row that doesn't apply is greyed out, never taken away (Explore has no questions to count)
	$('sizeBox').classList.toggle('is-off', S.mode === 'study');
	const best = saved.get('best', null);
	$('best').textContent = best ? t('best', { score: best.score, total: best.total, time: clock(best.ms) }) : t('no_best');
	$('know').textContent = t('shell.know', { n: known.size, m: ITEMS.length });
	ui.statsOff(S.mode === 'study');
	showStats();
}
function actions(list) {
	$('actions').replaceChildren(...list);
}

/* ---------- Explore: everything, with the answers ---------- */
function explore() {
	const item = ITEMS[look];
	prompt(t('shell.mode_study'), item.prompt, t('explore_n', { n: look + 1, m: ITEMS.length }));
	$('board').replaceChildren(h('div', { class: 'answer', text: item.answer }));
	const step = (d) => () => {
		look = (look + d + ITEMS.length) % ITEMS.length;
		explore();
	};
	const prev = h('button', { class: 'btn', type: 'button', text: t('previous') });
	const next = h('button', { class: 'btn primary', type: 'button', text: t('next') });
	prev.addEventListener('click', step(-1));
	next.addEventListener('click', step(1));
	actions([prev, next]);
}

/* ---------- Learn and Test: questions ---------- */
function ask() {
	const s = session;
	const item = s.queue[0];
	if (!item) return finish();
	s.answered = false;
	const total = S.mode === 'test' ? s.asked + s.queue.length : null;
	prompt(S.mode === 'test' ? t('shell.mode_test') : t('shell.mode_practice'), item.prompt,
		total ? t('question_n', { n: s.asked + 1, m: total }) : t('learn_left', { n: s.queue.length }));
	$('board').replaceChildren();
	actions(choicesFor(item, ITEMS).map((choice, i) => {
		const b = h('button', { class: 'btn', type: 'button', 'data-key': String(i + 1), text: choice.answer });
		b.addEventListener('click', () => answer(item, choice, b));
		return b;
	}));
}
function answer(item, choice, button) {
	const s = session;
	if (!s || s.answered) return;
	s.answered = true;
	const right = choice.id === item.id;
	s.asked++;
	if (right) {
		s.right++;
		s.streak++;
		s.longest = Math.max(s.longest, s.streak);
		known.add(item.id);
		saved.set('known', [...known]);
		fillRail();
	} else {
		s.streak = 0;
		s.misses.push(item);
	}
	ui.sound.play(right ? 'correct' : 'wrong', s.streak);
	button.classList.add(right ? 'is-ok' : 'is-bad');
	$('prompt').classList.toggle('is-ok', right);
	$('prompt').classList.toggle('is-bad', !right);
	$('pMeta').textContent = right ? t('right') : t('wrong', { answer: item.answer });
	s.queue = S.mode === 'practice' ? afterAnswer(s.queue, item, right) : s.queue.slice(1);
	showStats();
	const next = h('button', { class: 'btn primary', type: 'button', text: t('next') });
	next.addEventListener('click', go);
	actions([...$('actions').children].map((b) => ((/** @type {any} */ (b)).disabled = true, b)).concat(next));
	next.focus();
}
function go() {
	$('prompt').classList.remove('is-ok', 'is-bad');
	ask();
}
function finish() {
	const s = session;
	clearInterval(tick);
	if (S.mode !== 'test') return start(); // Learn goes round again
	const ms = Date.now() - s.started;
	const best = saved.get('best', null);
	const isBest = !best || s.right > best.score || (s.right === best.score && ms < best.ms);
	if (isBest) saved.set('best', { score: s.right, total: s.asked, ms });
	const misses = s.misses.slice();
	ui.result({
		eyebrow: t('test_complete'),
		score: s.right, total: s.asked, time: clock(ms), acc: `${Math.round((100 * s.right) / Math.max(1, s.asked))}%`, streak: s.longest,
		best: isBest, ok: s.right, bad: s.asked - s.right,
		again: start,
		misses: misses.length ? () => { setMode('practice', misses); } : null,
	});
	actions([]);
	fillPanel();
}

/* ---------- starting, the panel's controls, the keys ---------- */
function start(items = null) {
	clearInterval(tick);
	ui.clearResult();
	$('prompt').classList.remove('is-ok', 'is-bad');
	session = null;
	if (S.mode === 'study') explore();
	else {
		session = { queue: items || makeRound(ITEMS, S.size), asked: 0, right: 0, streak: 0, longest: 0, started: Date.now(), answered: false, misses: [] };
		if (S.mode === 'test') tick = window.setInterval(showStats, 1000);
		ask();
	}
	fillPanel();
}
function setMode(mode, items = null) {
	S.mode = mode;
	saved.set('mode', mode);
	start(items);
}
$('modeSeg').addEventListener('click', (e) => {
	const v = e.target.closest('button')?.dataset.v;
	if (v) setMode(v);
});
$('sizeSeg').addEventListener('click', (e) => {
	const v = e.target.closest('button')?.dataset.v;
	if (!v || S.mode === 'study') return;
	S.size = v;
	saved.set('size', v);
	start();
});
$('restartBtn').addEventListener('click', () => {
	document.body.classList.remove('sheet-open');
	start();
});
$('settingsBtn').addEventListener('click', () => document.body.classList.toggle('sheet-open'));
$('closeSheet').addEventListener('click', () => document.body.classList.remove('sheet-open'));
const setClean = (on) => document.body.classList.toggle('clean', on);
$('cleanBtn').addEventListener('click', () => {
	document.body.classList.remove('sheet-open');
	setClean(true);
});
$('cleanExit').addEventListener('click', () => setClean(false));

document.addEventListener('keydown', (e) => {
	if (ui.key(e)) return; // the shell first: an explanation or a window, ? and M
	if (e.metaKey || e.ctrlKey || e.altKey) return;
	// then Esc one step at a time: a phone's settings sheet, then clean view
	if (e.key === 'Escape') {
		if (document.body.classList.contains('sheet-open')) document.body.classList.remove('sheet-open');
		else setClean(false);
		return;
	}
	if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
	if (/^[1-9]$/.test(e.key)) /** @type {any} */ ($('actions').querySelector(`[data-key="${e.key}"]:not([disabled])`))?.click();
	else if (e.key === 'Enter' && session && session.answered) go();
	else if (S.mode === 'study' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
		look = (look + (e.key === 'ArrowRight' ? 1 : -1) + ITEMS.length) % ITEMS.length;
		explore();
	} else if (e.key === 'c' || e.key === 'C') setClean(!document.body.classList.contains('clean'));
});

// What the "i" beside a row says (never a line under the row)
function help(what) {
	if (what === 'mode') return ['study', 'practice', 'test'].map((m) => [t('shell.mode_' + m), t('help_' + m), S.mode === m]);
	if (what === 'rail') return t('help_rail');
	if (what === 'size') return t('help_size');
	return '';
}
const keys = () => [t('key_choose'), t('key_next'), t('key_clean')];
let toastTimer = 0;
function toast(text) {
	const el = $('toast');
	el.textContent = text;
	el.classList.add('show');
	clearTimeout(toastTimer);
	toastTimer = window.setTimeout(() => el.classList.remove('show'), 1800);
}

ui = startShell({ lang, store: saved, sound: 'glass-quick', help, keys, toast });
fillRail();
start();
lang.onChange(() => {
	fillRail();
	start();
});
// a first visit opens on the three modes, once
if (!saved.get('seen', false)) {
	saved.set('seen', true);
	ui.start({
		name: SiteLanguage.bootText('tool_name') || '__NAME__',
		lines: () => ({ study: t('help_study'), practice: t('help_practice'), test: t('help_test') }),
		pick: (m) => setMode(m),
	});
}
