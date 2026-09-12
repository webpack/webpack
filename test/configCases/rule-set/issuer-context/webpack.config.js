"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				oneOf: [
					{
						test: /value\.js$/,
						issuer: /[\\/]a\.js$/,
						use: path.resolve(__dirname, "issuer-loader.js")
					}
				]
			}
		]
	}
};
