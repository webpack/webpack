"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: { moduleSplitting: true },
	module: {
		rules: [{ test: /lib\.js$/, moduleSplitting: false }]
	},
	optimization: { minimize: true, concatenateModules: false }
};
