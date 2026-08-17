"use strict";

const BUNDLES = [
	"./bundle0.mjs",
	"./cjs.js",
	"./proto.mjs",
	"./empty.mjs",
	"./runtime.mjs"
];

module.exports = {
	findBundle(index) {
		return BUNDLES[index];
	}
};
