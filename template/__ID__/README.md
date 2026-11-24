# __NAME__

__DESC__ Made by __AUTHOR__ with the [samplesize1.com tool kit](https://github.com/SampleSize1/Tool-Kit-Public).

## What it teaches

What a visitor learns here, and what each mode does with it (Explore, Learn, Test).

## Sources and licences

Every fact, picture, recording, data set or font the tool uses, where it comes from, and its licence. Facts: how
they were checked.

| What | From | Licence |
| --- | --- | --- |
| The code | this repo | MIT |

## Decisions

Anything it does differently from AGENTS.md, and why.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page's markup |
| `style.css` | Its own look (after `../shell/shell.css`, the look every samplesize1.com tool shares) |
| `js/app.js` | The page |
| `js/core/` | What it knows, with no page code (tested in `tests/__ID__/`) |
| `js/text.js` | Every word the page shows, in English |
| `lang/<code>.json` | The same words in other languages |

## Languages

English to start. To add one: `lang/<code>.json` as `{ "ui": { … } }` with every key of `EN` in `js/text.js`
translated, then the code in `langs` (and its loading line in `boot`) in the page's `SiteLanguage.start`.
`npm run check` lists any word a language is missing.
