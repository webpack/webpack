"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				type: "css"
			}
		]
	},
	plugins: [
		new DefinePlugin(
			{
				"%ENV_COLOR%": "red",
				"process.env.THEME": '"dark"'
			},
			{ type: "css" }
		)
	]
};
