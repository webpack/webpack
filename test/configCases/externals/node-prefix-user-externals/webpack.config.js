"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "strip",
		// developer-provided `node:` external value on a target without prefix support
		target: "web",
		externals: {
			"node:fs": "commonjs node:fs",
			"node:path": "commonjs node:path"
		},
		output: {
			libraryTarget: "commonjs2",
			environment: { nodePrefixForCoreModules: false }
		}
	},
	{
		name: "keep",
		// same config, but the target supports the `node:` prefix
		target: "web",
		externals: {
			"node:fs": "commonjs node:fs",
			"node:path": "commonjs node:path"
		},
		output: {
			libraryTarget: "commonjs2",
			environment: { nodePrefixForCoreModules: true }
		}
	}
];
