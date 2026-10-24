"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [false, true].map((unsafeCache) => ({
	mode: "development",
	target: "node",
	cache: { type: "memory" },
	module: { unsafeCache },
	optimization: { moduleIds: "named" },
	externals: {
		"../shared": "commonjs path",
		"./shared": "commonjs path"
	}
}));
