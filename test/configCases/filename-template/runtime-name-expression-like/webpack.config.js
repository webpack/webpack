"use strict";

/** @import { Configuration, Chunk } from "../../../../" */

/** @type {Configuration} */
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
			/** @type {Chunk} */ (pathData.chunk).name === "main"
				? "main.js"
				: "runtime-[runtime].js"
	}
};
