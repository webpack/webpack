"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: ["./a.js", "./index.js"],
			mergeExports: true
		}
	},
	optimization: {
		runtimeChunk: "single"
	},
	output: {
		filename: "[name].js",
		library: {
			name: "DeferredLib",
			type: "assign"
		}
	}
};
