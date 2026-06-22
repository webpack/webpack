"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.css$/, type: "css/module" }]
	},
	experiments: { css: true },
	// "auto" publicPath resolves to a file:// dir on node so SSR can read the CSS
	output: { publicPath: "auto" }
};
