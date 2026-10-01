"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [{ test: /target\.js$/, sideEffects: false }]
	},
	optimization: {
		concatenateModules: false,
		mangleExports: false,
		minimize: false,
		moduleIds: "named"
	}
};
