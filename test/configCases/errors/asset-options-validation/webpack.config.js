"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.txt$/,
				type: "asset/inline",
				generator: {
					name: "[name].txt"
				}
			}
		]
	}
};
