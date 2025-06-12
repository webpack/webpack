"use strict";
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			type: "module"
		},
		module: true
	},
	experiments: {
		outputModule: true
	},
	optimization: {
		concatenateModules: true
	}
};
