"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	node: {
		__dirname: false
	},
	externalsPresets: {
		node: true
	},
	experiments: {
		css: true
	}
};
