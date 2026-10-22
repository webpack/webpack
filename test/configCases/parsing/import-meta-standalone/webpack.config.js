"use strict";

const { DefinePlugin } = require("../../../../");
const { version } = require("../../../../package.json");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "node",
	output: {
		module: true,
		chunkFormat: "module"
	},
	plugins: [
		// Requiring package.json from the case would bundle every dependency
		// line, so an edit to any of them moves this asset in the size report.
		new DefinePlugin({
			WEBPACK_MAJOR: JSON.stringify(Number.parseInt(version, 10))
		})
	]
};
