"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: ["./a.js", "./index.js"]
	},
	optimization: {
		runtimeChunk: "single"
	},
	output: {
		filename: "[name].js",
		library: {
			entryExports: "all",
			name: "DeferredLib",
			type: "assign"
		}
	}
};
