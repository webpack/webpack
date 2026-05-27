"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = {
	entry: "./index.cjs",
	output: {
		pathinfo: false
	},
	optimization: {
		moduleIds: "named",
		inlineExports: true
	}
};
