"use strict";

const NAMES = ["plain", "evaldev", "evalmap"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
