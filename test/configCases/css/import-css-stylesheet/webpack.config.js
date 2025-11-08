"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		parser: {
			css: {
				import: true,
				exportType: "css-style-sheet"
			}
		}
	}
};
