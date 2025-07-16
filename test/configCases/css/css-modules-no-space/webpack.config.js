"use strict";

/** @type {() => import("../../../../").Configuration} */
module.exports = () => ({
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.my-css$/i,
				type: "css/auto"
			},
			{
				test: /\.invalid$/i,
				type: "css/auto"
			}
		]
	},
	node: {
		__dirname: false,
		__filename: false
	}
});
