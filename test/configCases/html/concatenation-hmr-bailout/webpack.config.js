"use strict";

const { HotModuleReplacementPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	module: {
		rules: [
			{
				test: /\.html$/,
				type: "html"
			}
		]
	},
	optimization: {
		minimize: false,
		// HMR wires self-accept against a per-module `module.hot`, so an HTML
		// module merged into a shared scope would patch the wrong module id —
		// the generator has to refuse concatenation for it.
		concatenateModules: true
	},
	plugins: [new HotModuleReplacementPlugin()],
	stats: {
		optimizationBailout: true
	},
	experiments: {
		html: true
	}
};
