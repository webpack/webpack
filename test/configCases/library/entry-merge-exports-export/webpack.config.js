"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	entry: {
		main: ["./a.js", "./index.js"]
	},
	output: {
		library: {
			entryExports: "all",
			name: "PickedLib",
			type: "assign",
			export: "picked"
		}
	}
};
