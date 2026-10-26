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
 * Tells whether this part runs the work named `key`, by a hash of the name, so
 * a key keeps its part however the others around it change.
 * @param {string} key a name unique to one piece of work
 * @returns {boolean} true when this part runs it
 */
const isInPart = (key) => {
	const [part, parts] = currentPart();
	if (parts === 1) return true;
	// FNV-1a
	let hash = 0x811c9dc5;
	for (let i = 0; i < key.length; i++) {
		hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
	}
	return (hash >>> 0) % parts === part - 1;
};

module.exports = { currentPart, isInPart };
