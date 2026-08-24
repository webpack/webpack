"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	optimization: {
		minimize: false,
		removeEmptyChunks: false,
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				each: {
					test: /r\d/,
					chunks: "all",
					enforce: true,
					name: (module) => {
						const match = /** @type {RegExpExecArray} */ (
							/r(\d)\.js/.exec(module.identifier())
						);

						return `s${match[1]}`;
					}
				}
			}
		}
	},
	performance: {
		hints: "warning",
		tinyChunks: true
	}
};
