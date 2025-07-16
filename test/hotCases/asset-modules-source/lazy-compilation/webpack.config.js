"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		lazyCompilation: {
			entries: false,
			imports: true
		}
	},
	node: {
		__dirname: false
	},
	module: {
		generator: {
			asset: {
				filename: "assets/[name][ext]"
			}
		},
		rules: [
			{
				test: /file\.text$/,
				type: "asset/resource"
			}
		]
	}
};
