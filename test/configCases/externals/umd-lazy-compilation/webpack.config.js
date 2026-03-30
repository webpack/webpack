"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	output: {
		library: { type: "umd", name: "MyLib" }
	},
	externals: {
		"my-external": "my-external"
	},
	experiments: {
		lazyCompilation: {
			entries: false,
			imports: true
		}
	}
};
