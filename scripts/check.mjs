#!/usr/bin/env node
// Checks every tool in this folder against the rules in AGENTS.md that a script can check (npm run check), the same
// ones samplesize1.com holds its own tools to. One tool: npm run check -- <id>. It can't see how the tool behaves:
// open it at desktop and phone width too (the checklist at the end of AGENTS.md).
//
// It also lists every outside address a tool's files mention, so you (and Pranay) can see at a glance what it loads.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SHELL_PIECES, selectors } from './pieces.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT_FOLDERS = new Set(['shell', 'js', 'template', 'tests', 'scripts', 'node_modules', 'licenses']);
// the words the language module itself says (the picker, Credits): no tool repeats them
const MODULE_WORDS = new Set(['lang_title', 'lang_note', 'names_note', 'credits']);
// outside addresses every tool may load: the two Google Fonts hosts the template uses, and the site itself
const ALLOWED_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'samplesize1.com', 'www.w3.org']);

const exists = (p) => fs.existsSync(path.join(ROOT, p));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const walk = (dir) => !exists(dir) ? [] : fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
	.flatMap((e) => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);

const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const tools = (named.length ? named : fs.readdirSync(ROOT, { withFileTypes: true })
	.filter((e) => e.isDirectory() && !e.name.startsWith('.') && !KIT_FOLDERS.has(e.name) && exists(`${e.name}/index.html`))
	.map((e) => e.name)).sort();

if (!tools.length) {
	console.log('No tools yet. Start one: npm run new-tool -- <id> "<Name>" "<line>" "<your name>"');
	process.exit(0);
}

let failures = 0;

for (const id of tools) {
	const results = [];
	const check = (ok, what) => results.push([!!ok, what]);
	if (!exists(`${id}/index.html`)) { console.log(`${id}\n  FAIL no ${id}/index.html\n`); failures++; continue; }

	const page = read(`${id}/index.html`).replace(/<!--[\s\S]*?-->/g, '');
	const own = walk(id);
	const text = (exts) => own.filter((p) => exts.includes(path.extname(p))).map((p) => [p, read(p)]);

	// the folder and its files
	check(/^[a-z][a-z0-9-]*[a-z0-9]$/.test(id), 'its folder name is lowercase words with dashes (bird-calls)');
	const leftovers = [...own, ...walk(`tests/${id}`)].filter((p) => /\.(html|css|js|mjs|json|md)$/.test(p) && /__(ID|NAME|MARK|SUB|DESC|AUTHOR)__/.test(read(p)));
	check(!leftovers.length, `no template placeholders left${leftovers.length ? `: ${leftovers.join(', ')}` : ''}`);
	check(exists(`${id}/style.css`) && exists(`${id}/js/app.js`) && exists(`${id}/js/text.js`), 'the layout: style.css, js/app.js, js/text.js');
	check(exists(`${id}/README.md`), 'a README.md (what it teaches, sources and licences, decisions)');
	check(walk(`tests/${id}`).some((p) => p.endsWith('.test.mjs')), `tests in tests/${id}/ (npm test)`);
	const unchecked = own.filter((p) => /\.m?js$/.test(p) && !p.startsWith(`${id}/data/`) && !read(p).startsWith('// @ts-check'))
		.filter((p) => !/\.min\.js$|vendor\//.test(p));
	check(!unchecked.length, `every script of its own starts with // @ts-check${unchecked.length ? ` (not: ${unchecked.join(', ')})` : ''}`);

	// the page: the shell first, then its own styles, and the modules every tool loads
	const shellAt = page.indexOf('<link rel="stylesheet" href="../shell/shell.css">');
	const ownAt = Math.min(...['<style', 'href="style.css"'].map((s) => page.indexOf(s)).filter((i) => i >= 0));
	check(shellAt > 0 && shellAt < ownAt, 'loads ../shell/shell.css first, before its own styles');
	check(!/<style[\s>]/.test(page), 'no <style> in the page: its styles are in style.css');
	for (const m of ['progress', 'language', 'sound']) check(page.includes(`<script src="../js/${m}.js"></script>`), `loads ../js/${m}.js`);
	check(page.includes('<script type="module" src="js/app.js"></script>'), 'loads js/app.js as a module');
	check(new RegExp(`SiteLanguage\\.start\\(\\{ tool: '${id}',`).test(page), `SiteLanguage.start({ tool: '${id}', … }) in the page`);
	const rootLoads = [...page.matchAll(/(?:src|href)="(\/[^/"][^"]*)"/g)].map((m) => m[1]);
	check(!rootLoads.length, `nothing loaded from the site's root (use ../js/, ../shell/)${rootLoads.length ? `: ${rootLoads.join(', ')}` : ''}`);

	// the screen
	check(/<div class="brand">[\s\S]*?<div class="sub"[^>]*>[^<]+<\/div>/.test(page), 'a short line under its name (.sub in the brand)');
	const mark = page.match(/<div class="mark"[^>]*>([\s\S]*?)<\/div>/);
	check(mark && /<i class="beta"[^>]*>Beta<\/i>/.test(mark[1]), 'the Beta tag beside its name');
	const seg = page.match(/<div class="seg" id="modeSeg">([\s\S]*?)<\/div>/);
	const modes = seg ? [...seg[1].matchAll(/<button[^>]*data-v="(\w+)"[^>]*>([^<]*)<\/button>/g)].map((m) => `${m[1]}:${m[2].trim()}`) : [];
	check(modes.join() === 'study:Explore,practice:Learn,test:Test', 'a Mode row (#modeSeg) reading Explore / Learn / Test (study, practice, test)');
	const panelStart = page.indexOf('<aside class="panel"');
	const panel = panelStart >= 0 ? page.slice(panelStart, page.indexOf('</aside>', panelStart)) : '';
	check(panel, 'the settings panel (<aside class="panel">)');
	const heads = [...panel.matchAll(/<div class="sec-h">([\s\S]*?)<\/div>/g)].map((m) => m[1]);
	const noHelp = heads.filter((h) => !h.includes('langSel') && !/<button class="help" type="button" data-help="\w+"/.test(h));
	check(!noHelp.length, `every settings row but Language has its "i" (<button class="help" data-help="…">)${noHelp.length ? `: ${noHelp.length} without` : ''}`);
	check(!/<p class="hint" id="\w+Hint"/.test(panel), 'no explanation under a row: it goes behind the row\'s "i"');
	check(/<div class="panel-foot">[\s\S]*?id="prefsBtn"[\s\S]*?id="keysBtn"/.test(panel), 'Preferences and Keys in the settings\' foot');
	check(/<p class="credit"/.test(page), 'its credits in one element with class="credit"');

	// its styles don't restyle the shell's pieces (pieces.mjs)
	const sheets = [...page.matchAll(/<link rel="stylesheet" href="(?!https?:|\.\.\/)([^"]+)"/g)].map((m) => m[1]).filter((p) => exists(`${id}/${p}`));
	const restyled = sheets.flatMap((p) => selectors(read(`${id}/${p}`)).flatMap((s) => s.split(',').map((x) => x.trim())).filter((s) => SHELL_PIECES.includes(s)));
	check(!restyled.length, `its styles don't restyle the shell's pieces${restyled.length ? ` (restyles ${[...new Set(restyled)].join(', ')}: see scripts/pieces.mjs)` : ''}`);

	// its code: on the shell, its progress under its own name
	const app = exists(`${id}/js/app.js`) ? read(`${id}/js/app.js`) : '';
	check(/from '(\.\.\/)+shell\/shell\.js'/.test(app) && /startShell\(\{/.test(app), 'js/app.js starts the shell (startShell from ../../shell/shell.js)');
	check(/ui\.key\(e\)/.test(app), 'the shell\'s keys first in its keydown (ui.key(e))');
	check(/ui\.start\(\{/.test(app), 'a first visit opens on the three modes (ui.start)');
	check(/ui\.result\(\{/.test(app), 'a round ends on the shell\'s result (ui.result)');
	check(/sound:\s*['"][\w-]+['"]/.test(app), 'a sound kit from ../js/sound.js (startShell({ sound: \'glass-quick\' }))');
	check(app.includes(`SiteProgress.tool('${id}')`), `progress saved under its folder name (SiteProgress.tool('${id}'))`);
	if (page.includes('id="railList"')) check(/class: ['"]rg['"]|\(['"]rg['"],/.test(app), 'its list down the left uses the shell\'s rows (class "rg")');

	// its words: all in text.js, and every language file has every one
	let EN = null;
	try { ({ EN } = await import(pathToFileURL(path.join(ROOT, id, 'js/text.js')).href)); } catch (err) { check(false, `js/text.js loads and exports EN (${err.message})`); }
	if (EN) {
		const keys = [...new Set([...page.matchAll(/data-i18n(?:-aria|-boot)?="([\w.]+)"/g)].map((m) => m[1]))]
			.filter((k) => !k.startsWith('shell.') && !MODULE_WORDS.has(k));
		const missing = keys.filter((k) => !(k in EN));
		check(!missing.length, `every word in the page is in js/text.js${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
		const langs = (page.match(/langs:\s*\[([^\]]*)\]/) || [, ''])[1].match(/[\w-]+/g) || [];
		for (const code of langs.filter((c) => c !== 'en')) {
			const file = `${id}/lang/${code}.json`;
			if (!exists(file)) { check(false, `${file} (it's in langs)`); continue; }
			let ui = {};
			try { ui = JSON.parse(read(file)).ui || {}; } catch (err) { check(false, `${file} is JSON (${err.message})`); continue; }
			const gaps = Object.keys(EN).filter((k) => !(k in ui));
			check(!gaps.length, `${file} has every word${gaps.length ? ` (missing ${gaps.length}: ${gaps.slice(0, 6).join(', ')}${gaps.length > 6 ? '…' : ''})` : ''}`);
		}
	}

	// what it loads from outside: no third-party scripts, and every other address listed
	const files = text(['.html', '.js', '.mjs', '.css', '.json']);
	const scripts = files.flatMap(([, t]) => [...t.matchAll(/<script[^>]+src="(https?:[^"]+)"|import\s*(?:[^'"]*from\s*)?['"](https?:[^'"]+)['"]|import\(\s*['"](https?:[^'"]+)['"]/g)]).map((m) => m[1] || m[2] || m[3]);
	check(!scripts.length, `no scripts from other sites${scripts.length ? ` (${scripts.join(', ')})` : ''}`);
	const hosts = new Map();
	for (const [p, t] of files) for (const [, host] of t.matchAll(/https?:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
		const h = host.toLowerCase();
		if (!ALLOWED_HOSTS.has(h) && !h.endsWith('.samplesize1.com')) hosts.set(h, [...(hosts.get(h) || []), p]);
	}

	const bad = results.filter(([ok]) => !ok).length;
	failures += bad;
	console.log(`${id}${bad ? `: ${bad} to fix` : ': all checks pass'}`);
	for (const [ok, what] of results) if (!ok || process.argv.includes('--all')) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
	if (hosts.size) {
		console.log('  Mentions these outside sites (fine for links and listed sources; say why in its README):');
		for (const [h, ps] of hosts) console.log(`    ${h} (${[...new Set(ps)].join(', ')})`);
	}
	console.log('');
}

console.log(failures ? `${failures} problem(s) to fix (AGENTS.md says how).` : 'Every check passes. Now open it at desktop and phone width: the checklist at the end of AGENTS.md.');
process.exit(failures ? 1 : 0);
