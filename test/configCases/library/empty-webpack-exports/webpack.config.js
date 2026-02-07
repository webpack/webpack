"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	experiments: {
		outputModule: true
	},
	output: {
		library: {
			type: "module"
		},
		module: true,
		filename: "bundle.js"
	}
};
