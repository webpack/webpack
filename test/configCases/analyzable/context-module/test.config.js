"use strict";

const NAMES = ["plain", "split", "fake", "defer"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}.mjs`];
	}
};
