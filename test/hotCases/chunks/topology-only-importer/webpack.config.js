"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: { filename: "[name].js" },
	optimization: {
		splitChunks: {
			cacheGroups: {
				default: false,
				defaultVendors: false,
				dep: {
					test: /[\\/]dep\.js$/,
					name: "shared",
					chunks: "all",
					enforce: true,
					minSize: 0
				},
				lateDep: {
					test: /late-dep\.js$/,
					name: "late-shared",
					chunks: "all",
					enforce: true,
					minSize: 0
				}
			}
		}
	}
};
