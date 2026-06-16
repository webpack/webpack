"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css/module",
				parser: { exportType: "css-style-sheet" }
			}
		]
	},
	experiments: { css: true }
};
