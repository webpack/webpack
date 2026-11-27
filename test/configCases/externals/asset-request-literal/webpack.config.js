"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	output: { module: true },
	target: "node",
	externalsType: "asset",
	externals: [/\.png$/],
	optimization: {
		minimize: false
	}
};
