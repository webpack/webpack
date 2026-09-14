"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			false,
			null,
			{
				rules: [{ test: /\.txt$/, loader: "./loader" }]
			},
			{
				oneOf: [{ test: /\.md$/, loader: "./loader" }]
			}
		]
	}
};
