"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["node", "web"],
	externals: {
		util: "util"
	},
	externalsType: "module",
	// `util` only stands in for any `module` external; on this unversioned
	// universal target it warns that a browser can't load a static builtin import
	ignoreWarnings: [
		/universal target can't load the Node\.js built-in module "util"/
	],
	experiments: {
		lazyCompilation: {
			entries: false
		}
	},
	output: {
		module: true,
		chunkFormat: "module",
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		enabledLibraryTypes: ["module"]
	},
	optimization: {
		minimize: false
	}
};
