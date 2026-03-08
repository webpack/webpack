"use strict";

/** @type {import("../../../../").Configuration} */
/**
 * Create a webpack configuration for a given target.
 * @param {"node" | "web"} target target environment
 * @param {boolean} concatenateModules whether to concatenate modules
 * @returns {import("../../../../").Configuration} webpack configuration
 */
function createConfig(target, concatenateModules) {
	return {
		name: `${target}-${concatenateModules ? "concat" : "no-concat"}`,
		devtool: false,
		target,
		mode: "development",
		optimization: {
			chunkIds: "named",
			concatenateModules
		},
		module: {
			rules: [
				{
					test: /\.css$/,
					type: "css/module",
					parser: {
						exportType: "style"
					}
				}
			]
		},
		experiments: {
			css: true
		}
	};
}

module.exports = [
	createConfig("node", false),
	createConfig("node", true),
	createConfig("web", false),
	createConfig("web", true)
];
