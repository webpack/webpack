"use strict";

const path = require("node:path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: path.resolve(__dirname, "node_modules/pmodule"),
				sideEffects: true
			},
			{
				test: path.resolve(__dirname, "node_modules/nmodule"),
				sideEffects: false
			}
		]
	}
};
