"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.css$/, type: "css/module" }]
	},
	experiments: { css: true },
	// "auto" publicPath resolves to a file:// dir on node so SSR can read the CSS
	output: { publicPath: "auto" }
};
