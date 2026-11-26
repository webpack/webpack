"use strict";

/** @import { Configuration } from "webpack" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: {
		inlineExports: true,
		minimize: false
	}
};
