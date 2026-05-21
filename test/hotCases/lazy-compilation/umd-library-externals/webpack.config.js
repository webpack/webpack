"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			type: "umd",
			name: "TestLib"
		}
	},
	experiments: {
		lazyCompilation: {
			entries: false
		}
	}
};
