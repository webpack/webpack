"use strict";

/**
 * @typedef {{ kind: "value", target: 0 | 1, value: number } | { kind: "retarget" | "package-main", target: 0 | 1 } | { kind: "rename", name: "value" | "renamed" } | { kind: "side-effects", enabled: boolean } | { kind: "add" | "remove" | "restore" | "break" | "repair" }} Operation
 */

/**
 * Shuffles edit episodes while keeping error/recovery pairs together.
 * @param {number} seed reproducible unsigned seed
 * @returns {Operation[]} file mutations
 */
const generateWatchSequence = (seed) => {
	let state = seed >>> 0;
	/** @returns {number} next unsigned pseudo-random integer */
	const next = () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state;
	};
	/** @type {Operation[][]} */
	const episodes = [
		[{ kind: "value", target: 0, value: next() % 1000 }],
		[{ kind: "value", target: 1, value: next() % 1000 }],
		[
			{ kind: "add" },
			{ kind: "retarget", target: 1 },
			{ kind: "retarget", target: 0 }
		],
		[
			{ kind: "rename", name: "renamed" },
			{ kind: "rename", name: "value" }
		],
		[{ kind: "remove" }, { kind: "restore" }],
		[{ kind: "break" }, { kind: "repair" }],
		[
			{ kind: "side-effects", enabled: true },
			{ kind: "package-main", target: 1 },
			{ kind: "side-effects", enabled: false }
		]
	];
	for (let index = episodes.length - 1; index > 0; index--) {
		const other = next() % (index + 1);
		[episodes[index], episodes[other]] = [episodes[other], episodes[index]];
	}
	/** @type {Operation[]} */
	const sequence = [];
	for (const episode of episodes) sequence.push(...episode);
	return sequence;
};

module.exports = generateWatchSequence;
