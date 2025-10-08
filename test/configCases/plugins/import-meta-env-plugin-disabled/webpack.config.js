"use strict";

const { EnvironmentPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	plugins: [
		new EnvironmentPlugin({
			TEST_VAR: "test-value"
		})
	],
	module: {
		parser: {
			javascript: {
				importMetaEnv: false
			}
		}
	},
	optimization: {
		minimize: false
	}
};
