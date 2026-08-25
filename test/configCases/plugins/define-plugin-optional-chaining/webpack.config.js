"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			OBJECT: { SUB1: { a: 1 } },
			"OBJECT.SUB2": { a: 1 },
			"NOT_DEFINED.SUB2": { a: 1 },
			STRING: JSON.stringify("string"),
			// the shape issue 21822 was reported against
			"process.env": { NODE_ENV: JSON.stringify("production") }
		})
	]
};
