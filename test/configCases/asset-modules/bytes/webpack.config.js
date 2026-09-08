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
		output: { module: true },
		name: "universal",
		mode: "development",
		target: ["web", "node"],
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
	}
];
