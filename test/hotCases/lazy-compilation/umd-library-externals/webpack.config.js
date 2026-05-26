"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			type: "umd",
			name: "TestLib"
		}
	},
	externals: {
		util: "util"
	},
	externalsType: "umd",
	experiments: {
		lazyCompilation: {
			entries: false
		}
	}
};
