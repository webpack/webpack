"use strict";

// The css loading runtime module — a `<link>` loader with its own es5 obligation.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es5"],
	experiments: {
		css: true
	},
	output: {
		chunkFilename: "[name].js",
		cssChunkFilename: "[name].css"
	},
	optimization: {
		chunkIds: "named"
	}
};
