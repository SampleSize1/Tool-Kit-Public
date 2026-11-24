#!/usr/bin/env node
// Starts a new tool from template/, already in the samplesize1.com look:
//
//   npm run new-tool -- <id> "<Name>" "<what it is for, one short line>" "<your name>"
//   e.g. npm run new-tool -- bird-calls "Bird Calls" "Know every bird by its call" "Alex Smith"
//
// It writes the tool's page (<id>/: index.html, style.css, js/app.js, js/core/round.js, js/text.js, README.md) and its
// tests (tests/<id>/). The page works as it is, with a placeholder subject: three modes, every settings row with its
// "i", Preferences, Keys, the first-visit card, a test's result, the sounds and saved progress. Replace the subject
// (js/core/round.js first, then the page around it) and keep the rules in AGENTS.md.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'template');
// folders of the kit itself: not a tool's name
const RESERVED = new Set(['shell', 'js', 'template', 'tests', 'scripts', 'node_modules', 'licenses']);

/** The words that make the page this tool's: the name's last word is drawn in the brand's second colour (BIRD <span>CALLS</span>) */
export function fill(text, { id, name, sub, desc, author }) {
	const words = name.toUpperCase().split(/\s+/);
	const mark = words.length > 1 ? `${words.slice(0, -1).join(' ')} <span>${words.at(-1)}</span>` : `<span>${words[0]}</span>`;
	const swap = { __ID__: id, __NAME__: name, __MARK__: mark, __SUB__: sub, __DESC__: desc, __AUTHOR__: author };
	return Object.entries(swap).reduce((t, [k, v]) => t.split(k).join(v), text);
}

/** Every file of the template, as [path with the tool's id, its text] */
export function files(opts) {
	const out = [];
	const walk = (dir) => {
		for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
			const p = path.join(dir, e.name);
			if (e.isDirectory()) walk(p);
			else out.push([path.relative(TEMPLATE, p).split('__ID__').join(opts.id), fill(fs.readFileSync(p, 'utf8'), opts)]);
		}
	};
	walk(TEMPLATE);
	return out;
}

/** Writes the tool under root. Stops if anything of that id is there already. */
export function create(opts, root = ROOT) {
	if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(opts.id)) throw new Error(`The id is the tool's folder name: lowercase words with dashes (bird-calls), not "${opts.id}"`);
	if (RESERVED.has(opts.id)) throw new Error(`"${opts.id}" is one of the kit's own folders: pick another id`);
	const list = files(opts);
	const taken = list.map(([p]) => p).filter((p) => fs.existsSync(path.join(root, p)));
	if (taken.length) throw new Error(`Already there: ${taken.join(', ')}`);
	for (const [p, text] of list) {
		fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
		fs.writeFileSync(path.join(root, p), text);
	}
	return list.map(([p]) => p);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	const [id, name, sub, author] = process.argv.slice(2);
	if (!id || !name || !sub || !author) {
		console.error('Usage: npm run new-tool -- <id> "<Name>" "<what it is for, one short line>" "<your name>"\n' +
			'  e.g. npm run new-tool -- bird-calls "Bird Calls" "Know every bird by its call" "Alex Smith"');
		process.exit(1);
	}
	const opts = { id, name, sub, desc: `${sub.replace(/\.$/, '')}.`, author };
	try {
		const made = create(opts);
		console.log(`Made ${name}:\n  ${made.join('\n  ')}\n`);
		console.log(`Next:
  1. npm start, then open http://localhost:8000/${id}/ (a working tool with a placeholder quiz).
  2. The subject: replace ITEMS in ${id}/js/core/round.js (and the page around it), its words in ${id}/js/text.js.
  3. Its sources, licences and decisions in ${id}/README.md.
  4. npm run check and npm test until both pass, then the checklist at the end of AGENTS.md.`);
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
}
