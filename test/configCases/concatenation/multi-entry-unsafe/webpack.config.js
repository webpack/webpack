"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	// Two separate entry points — critical for the negative test.
	// entry-a goes through shared → page-a.
	// entry-b goes directly to page-a, bypassing shared.
	// This means shared is NOT guaranteed available before page-a in all paths.
	entry: {
		"entry-a": "./entry-a.js",
		"entry-b": "./entry-b.js"
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		concatenateModules: true,
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				shared: {
					test: /shared\.js/,
					name: "shared",
					enforce: true
				},
				pageA: {
					test: /page-a\.js/,
					name: "page-a-chunk",
					enforce: true
				}
			}
		}
	}
};
