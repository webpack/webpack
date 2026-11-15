"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	entry: {
		a: "./a.js",
		b: "./b.js",
		"a\nb": "./c.js"
	},
	output: {
		filename: (pathData) =>
			`${/** @type {string} */ (pathData.chunk && pathData.chunk.name).replace("\n", "_")}.js`
	},
	optimization: {
		minimize: false,
		concatenateModules: false,
		mangleExports: false,
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				shared: {
					test: /shared/,
					chunks: (chunk) => chunk.name !== "a\nb",
					minChunks: 2,
					name: "shared",
					enforce: true
				}
			}
		}
	}
};
