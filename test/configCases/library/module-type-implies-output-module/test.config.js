"use strict";

const BUNDLES = ["module.mjs", "modern-module.mjs", "entry-library.mjs"];

module.exports = {
	findBundle(i) {
		return [`./${BUNDLES[i]}`];
	}
};
