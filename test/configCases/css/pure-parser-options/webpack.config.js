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
				// `css/auto` with `pure: true`: pure-check kicks in for
				// filenames matching `IS_MODULES` (= `.modules?.<ext>`), and
				// must NOT kick in for other filenames since the file isn't
				// treated as a CSS module at all.
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
