"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: ["./a.js", "./index.js"]
	},
	experiments: { topLevelAwait: true },
	output: {
		library: {
			entryExports: "all",
			name: "AsyncLib",
			type: "assign"
		}
	}
};
