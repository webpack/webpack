"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /postcss-modules-local-by-default\.global\.modules\.css$/,
				type: "css/global"
			},
			{
				test: /postcss-modules-local-by-default\.local\.modules\.css$/,
				type: "css/module"
			},
			{
				test: /postcss-modules-local-by-default\.pure\.modules\.css$/,
				// Pure is like a local but more strict
				type: "css/module"
			}
		]
	}
};
