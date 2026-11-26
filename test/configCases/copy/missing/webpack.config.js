"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		copy: [
			"missing-directory",
			{ from: "assets/*.png" },
			// `ignore` naming the base of the pattern leaves nothing to copy
			{ from: "assets/*.txt", globOptions: { ignore: ["assets"] } }
		]
	}
};
