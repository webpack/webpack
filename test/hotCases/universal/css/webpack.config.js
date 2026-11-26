"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.css$/, type: "css/module" }]
	},
	experiments: { css: true }
};
