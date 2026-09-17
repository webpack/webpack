"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.module\.css$/,
				parser: {
					pure: true
				},
				type: "css/module"
			},
			{
				// `css/auto` with `pure: true`: the pure check applies to filenames matching
				// `IS_MODULES` (`.modules?.<ext>`) and must not apply to others, which are not
				// treated as CSS modules at all.
				test: /auto-.*\.css$/,
				parser: {
					pure: true
				},
				type: "css/auto"
			}
		]
	},
	experiments: {
		css: true
	}
};
