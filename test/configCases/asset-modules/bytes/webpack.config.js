"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "web",
		mode: "development",
		target: "web",
		experiments: {
			css: true
		},
		module: {
			rules: [
				{
					test: /\.svg$/,
					type: "asset/bytes"
				}
			]
		}
	},
	{
		name: "node",
		mode: "development",
		target: "node",
		experiments: {
			css: true
		},
		module: {
			rules: [
				{
					test: /\.svg$/,
					type: "asset/bytes"
				}
			]
		}
	},
	{
		name: "universal",
		mode: "development",
		target: ["web", "node"],
		experiments: {
			outputModule: true,
			css: true
		},
		module: {
			rules: [
				{
					test: /\.svg$/,
					type: "asset/bytes"
				}
			]
		}
	}
];
