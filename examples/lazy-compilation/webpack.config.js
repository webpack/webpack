"use strict";

const { HotModuleReplacementPlugin } = require("../../");

module.exports = {
	mode: "development",
	cache: {
		type: "filesystem",
		idleTimeout: 5000
	},
	experiments: {
		lazyCompilation: true
	},
	devServer: {
		hot: true,
		devMiddleware: {
			publicPath: "/dist/"
		}
	},
	plugins: [new HotModuleReplacementPlugin()]
};
