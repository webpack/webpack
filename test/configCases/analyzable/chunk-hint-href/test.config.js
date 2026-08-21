"use strict";

const NAMES = ["auto", "hashed", "override", "hmr"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
