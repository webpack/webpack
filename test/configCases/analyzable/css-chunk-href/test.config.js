"use strict";

const NAMES = ["auto", "hashed", "override"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
