"use strict";

module.exports = {
	findBundle(i) {
		const name = i === 0 ? "split" : "shared";
		return [`./${name}-node.mjs`, `./${name}-web.mjs`];
	}
};
