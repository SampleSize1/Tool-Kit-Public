/* __NAME__'s own logic (__ID__/js/core/), with no page. Replace these with tests of the real subject:
   that every item is right, and that a round asks what it should. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, makeRound, choicesFor, afterAnswer, BACK_SOON, BACK_LATER } from '../../__ID__/js/core/round.js';

test('every item has an id of its own, a question and an answer', () => {
	assert.ok(ITEMS.length >= 4);
	assert.equal(new Set(ITEMS.map((x) => x.id)).size, ITEMS.length);
	for (const x of ITEMS) assert.ok(x.id && x.prompt && x.answer, JSON.stringify(x));
});

test('a round has the size asked for, with no item twice', () => {
	assert.equal(makeRound(ITEMS, '3').length, 3);
	assert.equal(makeRound(ITEMS, 'all').length, ITEMS.length);
	assert.equal(new Set(makeRound(ITEMS, 'all').map((x) => x.id)).size, ITEMS.length);
});

test('the answers offered include the right one, once', () => {
	for (const x of ITEMS) {
		const c = choicesFor(x, ITEMS);
		assert.equal(c.filter((y) => y.id === x.id).length, 1);
		assert.equal(new Set(c.map((y) => y.id)).size, c.length);
	}
});

test('in Learn a miss comes back twice, soon and later', () => {
	const queue = makeRound(ITEMS, 'all');
	const missed = queue[0];
	const after = afterAnswer(queue, missed, false);
	assert.equal(after.filter((x) => x.id === missed.id).length, 2);
	assert.equal(after[BACK_SOON - 1].id, missed.id);
	assert.deepEqual(afterAnswer(queue, missed, true), queue.slice(1));
	assert.ok(BACK_LATER > BACK_SOON);
});
