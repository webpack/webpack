"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js"
	},
	output: {
		filename: "[name].mjs",
		module: true
	},
	target: "node14"
};
