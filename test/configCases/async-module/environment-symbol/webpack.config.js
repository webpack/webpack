"use strict";

const webpack = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration[]} */
module.exports = [true, false].map((symbol) => ({
	output: {
		environment: {
			symbol
		}
	},
	plugins: [
		new webpack.DefinePlugin({
			SUPPORTS_SYMBOL: JSON.stringify(symbol)
		})
	]
}));
