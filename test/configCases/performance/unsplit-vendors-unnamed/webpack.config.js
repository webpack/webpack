"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	target: "web",
	entry: { main: "./index.js", other: "./other.js" },
	output: { filename: "[name].js" },
	performance: {
		hints: "warning",
		unsplitVendors: true
	},
	optimization: {
		splitChunks: {
			chunks: "all",
			minSize: 0,
			cacheGroups: {
				default: false,
				defaultVendors: false,
				// `name: false` leaves the shared initial chunk unnamed, and it holds
				// the vendor and the application module together.
				shared: {
					test: /shared\.js$|node_modules/,
					enforce: true,
					name: false
				}
			}
		}
	}
};
