"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		library: {
			type: "umd",
			name: "MyLib"
		}
	},
	experiments: {
		lazyCompilation: {
			entries: false
		}
	}
};
