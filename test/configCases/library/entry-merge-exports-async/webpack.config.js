"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
