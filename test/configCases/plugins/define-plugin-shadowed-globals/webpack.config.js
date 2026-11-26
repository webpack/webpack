"use strict";

const { DefinePlugin } = require("../../../../");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			UNDEFINED: undefined,
			NAN: Number.NaN,
			POSITIVE_INFINITY: Infinity,
			NEGATIVE_INFINITY: -Infinity,
			OBJECT: { value: undefined, list: [Number.NaN, Infinity] }
		})
	]
};
