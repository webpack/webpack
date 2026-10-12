"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	experiments: {
		moduleSplitting: { exclude: /lib\.js$/ }
	},
	optimization: { minimize: true, concatenateModules: false }
};
