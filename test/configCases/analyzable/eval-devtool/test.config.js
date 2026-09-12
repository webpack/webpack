"use strict";

const NAMES = ["plain", "evaldev", "evalmap", "evalarray"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
