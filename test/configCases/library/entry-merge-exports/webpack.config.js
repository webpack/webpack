"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: {
			import: ["./a.js", "./b.js", "./index.js"],
			mergeExports: true
		}
	},
	output: {
		library: {
			name: "MergedLib",
			type: "assign"
		}
	}
};
