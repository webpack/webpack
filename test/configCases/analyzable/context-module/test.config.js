"use strict";

const NAMES = ["plain", "split", "fake", "defer", "theme"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
