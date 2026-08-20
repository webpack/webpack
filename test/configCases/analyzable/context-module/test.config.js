"use strict";

const NAMES = ["plain", "split", "fake", "defer", "theme", "mixed"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
