"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	module: {
		noParse: [
			path.resolve(__dirname, "not-parsed-a"),
			/not-parsed-b/,
			"not-parsed-{c,d}.js",
			"loaders/**"
		]
	}
};
