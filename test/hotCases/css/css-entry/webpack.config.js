"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: {
		"css-entry": "./entry.css",
		main: "./index.js"
	},
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
