# samplesize1.com Tool Kit

Build a study tool that looks and works like the ones on [samplesize1.com/tools](https://samplesize1.com/tools/).
The kit has the shared look, a working template, the rules and a checker. There's no framework and no build step,
and the only thing to install is Node 22.

## Quick start

1. Click **Use this template** → **Create a new repository**, then clone your copy.
2. Start a tool:
   ```sh
   npm run new-tool -- bird-calls "Bird Calls" "Know every bird by its call" "Your Name"
   ```
3. Run `npm start` and open http://localhost:8000/bird-calls/. It's a working tool, with a placeholder quiz.
4. Make it yours. The subject starts in `bird-calls/js/core/round.js`, and its words are in
   `bird-calls/js/text.js`.
5. Run `npm run check` and `npm test` until both pass. Then go through the checklist at the end of
   [AGENTS.md](AGENTS.md).
6. Turn on GitHub Pages (Settings → Pages → Deploy from a branch → `main`, `/ (root)`), and email the link to
   hello@samplesize1.com.

**The rules are in [AGENTS.md](AGENTS.md).** If you use Claude Code, Codex or Cursor, it reads that file by itself:
describe the tool you want, and it will build it the samplesize1.com way.

## What's in it

| Path | What it is |
| --- | --- |
| `shell/` | The look and the pieces every samplesize1.com tool shares (settings, windows, a round's result), in 25 languages |
| `js/` | Saved progress, languages and sounds: what every tool page loads |
| `template/` | The tool `npm run new-tool` starts from |
| `scripts/` | `new-tool`, `check` (the rules a script can check), `serve` (`npm start`) |
| `AGENTS.md` | The rules: the screen, words and languages, sounds, licences, and what to check before sending a tool |

Each tool you make goes in its own folder, beside `shell/` and `js/`, the same way the tools sit on the site. That
means a finished tool can move onto samplesize1.com unchanged.

## After you send it

Pranay tries every tool he's sent. If he'd like it on samplesize1.com, he'll get in touch. It would go up as Beta,
credited to you. Either way, it's your work: publish and share it however you like.

## Licence

The kit's code is MIT ([LICENSE](LICENSE)). So is the code of a tool made with it, unless you say otherwise. Each
picture, recording or data set a tool uses keeps its own licence, listed in that tool's README.
