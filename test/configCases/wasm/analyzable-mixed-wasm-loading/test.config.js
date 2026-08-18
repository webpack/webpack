"use strict";

const NAMES = ["split", "shared", "multi", "multi-fetch"];
// The two shared-chunk configs run a pair of entries; the rest run three.
const PAIRS = new Set([2, 3]);

module.exports = {
	findBundle(i) {
		const name = NAMES[i];
		return PAIRS.has(i)
			? [`./${name}-a.mjs`, `./${name}-b.mjs`]
			: [`./${name}-node.mjs`, `./${name}-web.mjs`, `./${name}-alone.mjs`];
	}
};
