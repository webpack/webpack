"use strict";

/**
 * This run's part of a test file `--parts=<n>` splits, as `[part, parts]` from
 * 1; `[1, 1]` without the flag, so the one part runs everything.
 * @returns {[number, number]} this part and how many there are
 */
const currentPart = () =>
	/** @type {{ __TEST_PART__?: [number, number] }} */ (globalThis)
		.__TEST_PART__ || [1, 1];

/**
 * Picks the keys this part runs, dealing them longest first, each to the part
 * with the least weight so far; a key missing from `weights` counts as their median.
 * @param {string[]} keys every key, in any order
 * @param {Record<string, number>} weights each key's measured cost, e.g. milliseconds
 * @returns {Set<string>} the keys of this part
 */
const keysOfPart = (keys, weights) => {
	const [part, parts] = currentPart();
	if (parts === 1) return new Set(keys);
	const known = Object.values(weights).sort((a, b) => a - b);
	const fallback = known[Math.floor(known.length / 2)] || 1;
	const weighted = keys
		.map((key) => ({ key, weight: weights[key] || fallback }))
		.sort((a, b) => b.weight - a.weight || (a.key < b.key ? -1 : 1));
	const loads = Array.from({ length: parts }, () => 0);
	/** @type {Set<string>} */
	const mine = new Set();
	for (const { key, weight } of weighted) {
		const target = loads.indexOf(Math.min(...loads));
		loads[target] += weight;
		if (target === part - 1) mine.add(key);
	}
	return mine;
};

module.exports = { currentPart, keysOfPart };
