"use strict";

/** @type {import("../../../..").Configuration[]} */
module.exports = /** @type {const} */ (["memory", "filesystem"]).map(
	(type, index) => ({
		mode: "production",
		entry: { bundle: "./index.js", other: "./other.js" },
		cache: { type },
		devtool: false,
		output: { filename: `[name]${index}.js`, clean: false },
		optimization: {
			minimize: false,
			emitOnErrors: true
		}
	})
);
