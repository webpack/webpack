"use strict";

const common = {
	mode: "development",
	devtool: false,
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				type: "css/module",
				generator: {
					localIdentName: "[file]__[local]"
				}
			}
		]
	},
	experiments: {
		css: true
	}
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...common,
		name: "web",
		target: "web"
	},
	{
		...common,
		name: "node",
		target: "node"
	}
];
