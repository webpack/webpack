"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.svg/,
				type: "asset/inline"
			},
			{
				mimetype: "image/svg+xml",
				type: "asset/inline"
			}
		]
	}
};
