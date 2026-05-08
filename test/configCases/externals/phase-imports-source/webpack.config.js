"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = [
	{
		target: [`async-node${process.versions.node.split(".").map(Number)[0]}`],
		entry: {
			main: "./index.js",
			bundle: "./bundle.js"
		},
		output: {
			filename: "[name].js"
		},
		optimization: {
			concatenateModules: false
		},
		experiments: {
			sourceImport: true
		},
		externals: {
			"ext-var-sync": "var 'sync-value'",
			"ext-promise-async": "promise Promise.resolve('async-value')"
		}
	}
];
