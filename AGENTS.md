# Building a tool for samplesize1.com

The rules for anyone building a tool with this kit, person or coding agent. A tool that keeps them looks and works
like the others on [samplesize1.com/tools](https://samplesize1.com/tools/), and could go on the site as it is.
`CLAUDE.md` points here, so Claude Code reads this too.

## What a tool is

- **A standalone web page**: plain HTML, CSS and JavaScript modules. No framework, no build step, and no npm packages
  in the page. It runs from any static host (GitHub Pages, or `npm start` on your computer).
- **For learning something by drilling it.** The layout: what to learn down the left, the question in the middle, the
  settings on the right. There are three modes: Explore (look through everything, no score), Learn (questions with
  help, misses come back) and Test (questions with no help, timed and scored).
- **Everything stays in the visitor's browser**: no accounts, no server, no analytics.
- **It works on a phone.** Most visitors arrive from an Instagram bio link, so on an iPhone, in Safari.
- **This kit is for tools of that kind**, like the trainers, Dog Breeds and Car Brands on the site. The 3D anatomy
  atlases and the world maps run on engines of their own (in SampleSize1/Anatomy-Atlas and SampleSize1/Geography-Tools):
  building on those is a much bigger job, so ask first (hello@samplesize1.com).

## The kit

| Path | What it is |
| --- | --- |
| `shell/` | The look and the pieces every tool shares: `shell.css`, `shell.js`, and their words (`text.js`, `lang/`, 25 languages). Don't edit it. |
| `js/` | What every tool page loads: `progress.js` (saved progress), `language.js` (languages), `sound.js` (sounds). Don't edit them. The top of each file says how to use it. |
| `template/` | What `npm run new-tool` copies. |
| `scripts/` | `new-tool.mjs`, `check.mjs` (the rules a script can check), `serve.mjs` (`npm start`) and `pieces.mjs` (the shell's pieces, which a tool's styles never restyle). |
| `<id>/` | A tool, one folder each, beside `shell/` and `js/` as on the site. |
| `tests/<id>/` | Its tests. |

`shell/`, `js/` and `template/` are copied from samplesize1.com and kept current in SampleSize1/Tool-Kit-Public. You never
edit them, so taking a newer version is a straight replace of those three folders.

## Starting a tool

```sh
npm run new-tool -- <id> "<Name>" "<what it is for>" "<your name>"
npm start        # then open http://localhost:8000/<id>/
```

- **id**: the tool's folder name, in lowercase words with dashes (`bird-calls`). Its saved progress is kept under it.
- **Name**: two or three words. The last one is drawn in the brand's second colour.
- **What it is for**: one short line, shown under the name at every width ("Know every bird by its call").
- You need Node 22 or later, and nothing else.

The tool works from the first minute, with a placeholder quiz. Replace the subject (start in `js/core/round.js`) and
keep the wiring around it: it already does everything below.

## A tool's files

- `<id>/index.html`: its markup only. No `<style>`, and no script but the `SiteLanguage.start` call.
- `<id>/style.css`: its own layout and subject only.
- `<id>/js/app.js`: the page.
- `<id>/js/core/`: what the tool knows (its items, how a round is made, what counts as right), with no page code, so
  `tests/<id>/` can test it in Node.
- `<id>/js/text.js`: every word it shows, in English. `<id>/lang/<code>.json`: its other languages.
- `<id>/data/`: long or generated lists. Pictures and recordings each get a folder of their own.
- `<id>/README.md`: what it teaches, its sources and licences, and its decisions.
- Every script of its own starts with `// @ts-check` (data files and bundled libraries excepted).
- An item has an `id` that never changes. Progress is saved by it, never by the item's place in the list.

## The shell

- `../shell/shell.css` is linked first, before anything of the tool's own. It holds:
  - the colours and fonts, as CSS variables (`--fg`, `--muted`, `--ok`, `--bad`…);
  - the brand, its Beta tag and the line under it;
  - the name card and the three score boxes;
  - the settings panel and its rows with their "i";
  - the windows (Preferences, Keys, the first-visit card);
  - a round's result, the toast, clean view and the phone sheets.
- **Never restyle a shell piece** in the tool's own styles. The list is in `scripts/pieces.mjs`, and `npm run check`
  enforces it. A tool may place a piece in its own grid. If a piece should look different, say so in the README:
  on the site it changes in `shell.css`, for every tool.
- `shell.js` builds the windows, the "i" explanations and the result, through
  `const ui = startShell({ lang, store, sound, help, keys, prefs, toast })`. The top of `shell/shell.js` says what
  each option is. Then, in the tool's code:
  - `ui.key(e)` first in its keydown;
  - `ui.start({…})` on a first visit;
  - `ui.result({…})` at the end of a round;
  - `ui.statsOff(true)` in Explore.
- Use the shell's words (`shell.mode_study`, `shell.go_again`…) rather than your own for the same thing.

## The screen

These are the rules every tool on the site keeps:

- **Layout.** A wide middle column (`<div class="ui wide">` with `.centre`: the name card, the subject, the buttons)
  sits between the list on the left and the settings on the right. Rows in the list use the shell's class `rg`. On a
  phone, the settings open as a sheet.
- **The brand.** The tool's name with the Beta tag beside it, and its short line (`.sub`) under it, at every width.
- **Modes.** Explore / Learn / Test, in a Mode row at the top of the settings, under Language. In code and in saved
  data they are `study`, `practice` and `test`.
- **Nothing moves when the mode changes.** The settings keep the same rows in the same order in every mode:
  Language, Mode, Questions, the tool's own rows, then Restart and Clean view. A row that doesn't apply is greyed
  out, never removed, and the score is greyed out in Explore.
- **Explanations sit behind an "i".** Each row's explanation is behind the small "i" beside its title
  (`data-help="…"`, answered by the `help` you give the shell), never a line under it. Every row has one except
  Language.
- **On / Off rows.** A row that is only On / Off has its switch on its title's line.
- **Under Restart and Clean view** comes the best line, then "You know N of M" if the tool can count what is known.
- **The settings' foot.** Preferences and Keys are links there, with the credits folded under them (one element with
  `class="credit"`). Anything set once (the sound, playing automatically) goes in Preferences, not the settings.
- **First visit.** It opens on the card with the three modes.
- **The end of a round.** It ends on the shell's result, in the name card's place:
  - the score, big;
  - Time, Accuracy and Streak;
  - a New best pill when there is one;
  - Go again, plus a second action (Practise the misses);
  - the key to the colours.

  The score boxes are off while it shows.
- **Learn.** A miss comes back twice, soon and later (the template's `afterAnswer`).
- **Keys.** Every action has a key, listed in the Keys window (also opened with `?`). M switches the sound.
- **Esc goes one step at a time.** It closes an explanation, then a window, then a phone's sheet, then clean view.
- **Right-to-left languages mirror.** In Arabic, Persian, Hebrew and Urdu the screen mirrors: use start and end in
  CSS (`margin-inline-start`, `inset-inline-end`), not left and right. Previous and Next swap sides.

## Words and languages

- Every word the tool shows is in `js/text.js`, never written into the page code. The markup uses
  `data-i18n="key"` (`data-i18n-aria` for labels) and the code uses `t('key', vars)`. Plurals are `{ one, other }`.
- `../js/language.js` picks the language, fills the picker and saves the visitor's choice for every tool. The top of
  the file says how it works. The template already calls it.
- **English only is fine to start.** To add a language:
  1. Write `<id>/lang/<code>.json` as `{ "ui": { …every key of EN… } }`.
  2. Add its code to `langs` in the page's `SiteLanguage.start`.

  The shell's own words are already in 25 languages (Arabic, Bengali, Chinese simplified and traditional, Dutch,
  French, German, Greek, Hebrew, Hindi, Hungarian, Indonesian, Italian, Japanese, Korean, Persian, Polish,
  Portuguese, Russian, Spanish, Swedish, Turkish, Ukrainian, Urdu, Vietnamese), so you translate only your own.
  `npm run check` lists any word a language is missing.

## Sounds

- A tool with right and wrong answers plays a kit from `../js/sound.js` (`glass-quick`, as the template does):
  `ui.sound.play('correct', streak)`, `'wrong'`, `'finish'` (`'perfect'`, `'good'` or `'rough'`), `'best'`, `'mode'`.
  The top of `sound.js` lists every kit and moment. Every sound is made in the browser: no sound files.
- The rules every kit keeps:
  - a right answer is short and bright;
  - a miss is lower and quieter, and never a buzzer;
  - nothing at all for looking around, dragging or hovering.
- Never write audio code of your own for answers. Sound that is the subject itself (recordings, tones to learn) is
  the tool's own.

## Saved progress

`const saved = SiteProgress.tool('<id>')`, then `saved.get(key, default)` and `saved.set(key, value)`. It is saved in
the visitor's browser only, under the tool's folder name.

## Content, sources and licences

- **Your code is MIT** (LICENSE). By sending a tool, you agree it may be added to samplesize1.com and its public
  repos under MIT, credited to you.
- **Everything else needs a licence that allows that**: every picture, recording, data set and font (public domain,
  CC0, CC BY, CC BY-SA, ODbL…). Say so if a licence is non-commercial. List each one, with where it came from, in
  the README and in the credit line.
- **The facts must be right.** Say in the README where they come from and how you checked them.
- **No third-party scripts, analytics, ads, trackers, cookies or embeds.** A page loads only:
  - its own files and the kit's;
  - the two Google Fonts addresses the template uses;
  - data or pictures from a source named in its README.

  `npm run check` lists every outside address it finds.

## Before you send it

1. `npm run check` passes.
2. `npm test` passes, with tests of the subject: that every item is right, and that a round asks what it should.
3. Open it at desktop width and at phone width (your browser's device toolbar, iPhone size), and go through:
   - the first-visit card and Explore;
   - a Learn round with a right and a wrong answer;
   - a whole Test;
   - Preferences, Keys and Esc.

   There should be no errors in the console and nothing wider than the screen. On a real iPhone too, if you can.
4. The README says what it teaches, where everything comes from and under what licence, and anywhere it differs
   from these rules, and why.

## Sending it

1. Publish it with GitHub Pages: in your repo, Settings → Pages → Deploy from a branch → `main`, `/ (root)`. The tool
   is then at `https://<you>.github.io/<repo>/<id>/`.
2. Email the link and the repo to hello@samplesize1.com.

Pranay will try it. If he'd like it on samplesize1.com, he'll get in touch: it would go up as Beta, with your name
on it.
