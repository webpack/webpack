"use strict";

const NAMES = ["no-loading", "loading", "node"];

module.exports = {
	findBundle(i) {
		return [`./${NAMES[i]}/main.mjs`];
	}
};
