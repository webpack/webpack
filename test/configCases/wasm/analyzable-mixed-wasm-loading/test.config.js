"use strict";

const NAMES = ["split", "shared", "multi"];

module.exports = {
	findBundle(i) {
		const name = NAMES[i];
		return i === 2
			? [`./${name}-a.mjs`, `./${name}-b.mjs`]
			: [`./${name}-node.mjs`, `./${name}-web.mjs`, `./${name}-alone.mjs`];
	}
};
