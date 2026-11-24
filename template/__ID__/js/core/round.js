// @ts-check
/* What __NAME__ knows, with no page code: the unit tests run it (tests/__ID__/). Start here: replace ITEMS with
   the tool's subject, and keep the page (../app.js) to showing it.
   An item has an id that never changes (saved progress is kept by it, never by its place in the list), the question
   and its answer, in English; other languages translate them in lang/<code>.json. */

export const ITEMS = [
	{ id: 'one', prompt: 'Example one', answer: 'Answer one' },
	{ id: 'two', prompt: 'Example two', answer: 'Answer two' },
	{ id: 'three', prompt: 'Example three', answer: 'Answer three' },
	{ id: 'four', prompt: 'Example four', answer: 'Answer four' },
	{ id: 'five', prompt: 'Example five', answer: 'Answer five' },
];

/** Shuffles a copy of list. random: () => [0, 1) */
export function shuffled(list, random = Math.random) {
	const out = list.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** The questions of a round: `size` items (all of them for 'all'), in a random order. */
export function makeRound(items, size, random = Math.random) {
	const order = shuffled(items, random);
	return size === 'all' ? order : order.slice(0, Math.min(Number(size), order.length));
}

/** The answers offered for an item: its own and up to three others, in a random order. */
export function choicesFor(item, items, random = Math.random) {
	const others = shuffled(items.filter((x) => x.id !== item.id), random).slice(0, 3);
	return shuffled([item, ...others], random);
}

/** Learn mode brings a miss back: twice, soon and later (as every atlas does) */
export const BACK_SOON = 2;
export const BACK_LATER = 5;
/** The queue after an answer: a miss goes back in BACK_SOON and BACK_LATER questions from now. */
export function afterAnswer(queue, item, right) {
	const rest = queue.slice(1);
	if (right) return rest;
	rest.splice(Math.min(BACK_SOON - 1, rest.length), 0, item);
	rest.splice(Math.min(BACK_LATER - 1, rest.length), 0, item);
	return rest;
}
