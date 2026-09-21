"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: ["./a.js", "./b.js", "./index.js"]
	},
	output: {
		library: {
			entryExports: "all",
			name: "MergedLib",
			type: "assign"
		}
	}
};
