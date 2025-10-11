"use strict";

const { DotenvPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new DotenvPlugin({
			prefix: "TEST_",
			dir: __dirname,
			template: ["env.txt"]
		})
	],
	optimization: {
		minimize: false
	}
};
