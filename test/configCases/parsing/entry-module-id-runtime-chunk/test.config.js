"use strict";

const BUNDLES = [
	"./node.main.js",
	"./web.main.js",
	"./webworker.main.js",
	"./universal.main.mjs"
];

module.exports = {
	findBundle(i) {
		return [BUNDLES[i]];
	}
};
