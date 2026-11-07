"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		parser: {
			"css/auto": {
				namedExports: true
			}
		},
		generator: {
			"css/auto": {
				localIdentName: "[local]",
				exportsOnly: true
			}
		}
	}
};
