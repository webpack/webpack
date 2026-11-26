"use strict";

const ResolvePackageFromRootPlugin = require("./ResolvePackageFromRootPlugin");

/** @import { Configuration } from "../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	output: {
		filename: "bundle.js"
	},
	resolve: {
		plugins: [new ResolvePackageFromRootPlugin(__dirname)]
	},
	stats: {
		chunkModules: false,
		modules: true
	}
};
