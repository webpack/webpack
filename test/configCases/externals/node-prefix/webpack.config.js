"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "no-prefix",
		// target without `node:` support -> the prefix must be stripped from externals
		target: "node",
		output: {
			libraryTarget: "commonjs2",
			environment: { nodePrefixForCoreModules: false }
		}
	},
	{
		name: "prefix",
		// target with `node:` support -> the authored request is kept verbatim
		target: "node",
		output: {
			libraryTarget: "commonjs2",
			environment: { nodePrefixForCoreModules: true }
		}
	}
];
