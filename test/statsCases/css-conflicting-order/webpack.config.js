"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: "./index.js",
	experiments: {
		css: true
	},
	optimization: {
		splitChunks: {
			cacheGroups: {
				css: {
					type: "css/auto",
					enforce: true,
					name: "css"
				}
			}
		}
	},
	stats: {
		all: false,
		warnings: true
	}
};
