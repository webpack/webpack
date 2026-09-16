"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	devtool: false,
	output: {
		cssFilename: "[name].css"
	},
	experiments: {
		css: true
	},
	node: {
		__dirname: false
	}
};
