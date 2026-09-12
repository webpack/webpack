"use strict";

const BUNDLES = [
	["module.mjs"],
	["modern-module.mjs"],
	["entry-module.mjs", "entry-modern-module.mjs"]
];

module.exports = {
	findBundle(i) {
		return BUNDLES[i].map((name) => `./${name}`);
	}
};
