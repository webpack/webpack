"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: ["./a.js", "./index.js"],
			mergeExports: true
		}
	},
	experiments: { topLevelAwait: true },
	output: {
		library: {
			name: "AsyncLib",
			type: "assign"
		}
	}
};
