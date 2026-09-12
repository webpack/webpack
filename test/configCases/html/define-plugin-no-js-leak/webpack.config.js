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
				"%HTML_ONLY%": "html value",
				"CFG.htmlOnly": '"leaked"'
			},
			{ type: "html" }
		),
		new DefinePlugin({ CFG: { js: '"ok"' } })
	]
};
