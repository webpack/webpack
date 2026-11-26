"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
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
