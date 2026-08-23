"use strict";

// The jsonp chunk loader, the prefetch hint and the startup code, held to what
// an es5 target can parse and run.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es5"],
	output: {
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
