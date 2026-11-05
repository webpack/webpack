"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		main: {
			import: "./index.js",
			runtime: '" + rt + "'
		}
	},
	output: {
		filename: (pathData) =>
			/** @type {import("../../../../").Chunk} */ (pathData.chunk).name ===
			"main"
				? "main.js"
				: "runtime-[runtime].js"
	}
};
