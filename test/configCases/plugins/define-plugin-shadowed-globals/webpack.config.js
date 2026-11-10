"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
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
