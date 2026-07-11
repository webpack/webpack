"use strict";

const DefinePlugin = require("../../../../").DefinePlugin;

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		environment: {
			bigIntLiteral: true
		}
	},
	plugins: [
		new DefinePlugin({
			BIGINT: 9007199254740993n,
			ZERO_BIGINT: 0n
		})
	]
};
