"use strict";

const { DefinePlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: {
		html: true
	},
	module: {
		rules: [
			{
				test: /\.html$/,
				type: "html"
			}
		]
	},
	plugins: [
		new DefinePlugin(
			{
				"%APP_TITLE%": '"webpack"',
				"process.env": '"env"',
				"process.env.NODE_ENV": '"production"'
			},
			{ type: "html" }
		)
	]
};
