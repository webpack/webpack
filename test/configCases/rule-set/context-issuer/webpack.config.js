"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.svg$/,
				issuer: /\.js$/,
				type: "asset/resource"
			}
		]
	}
};
