"use strict";

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		timings: false,
		builtAt: false,
		hash: false,
		modules: true,
		chunks: false
	}
};
