"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [{ test: /[\\/]pure\.js$/, sideEffects: false }]
	},
	optimization: {
		concatenateModules: true
	}
};
