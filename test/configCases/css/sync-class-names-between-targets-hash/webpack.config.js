"use strict";

/**
 * @param {string} name config name
 * @param {"web" | "node"} target target
 * @param {string} uniqueName output unique name
 * @returns {import("../../../../").Configuration} config
 */
const config = (name, target, uniqueName) => ({
	name,
	target,
	// production default `localIdentName` is `[fullhash]`
	mode: "production",
	devtool: false,
	output: {
		uniqueName
	},
	optimization: {
		// keep the build deterministic and fast, class names are what matters here
		minimize: false
	},
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				resourceQuery: /\?hash$/,
				type: "css/module",
				generator: {
					localIdentName: "[hash]"
				}
			},
			{
				test: /\.module\.css$/,
				resourceQuery: { not: [/\?hash$/] },
				type: "css/module"
			}
		]
	},
	experiments: {
		css: true
	}
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("web", "web", "app"),
	config("node", "node", "app"),
	config("node-other-unique-name", "node", "other-app")
];
