"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: {
		copy: ["files", "single.txt", { from: "files/*.txt", to: "globbed" }]
	}
};
