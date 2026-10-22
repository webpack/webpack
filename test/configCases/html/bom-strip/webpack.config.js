"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		rules: [
			{
				test: /loaded\.html$/,
				loader: path.resolve(__dirname, "bom-loader.js")
			}
		]
	},
	experiments: { html: true }
};
