"use strict";

// The neutral platform at its oldest: one bundle for a browser and for Node.js,
// so no single global identifier is defined on both sides and every DOM access
// sits behind a guard. A neutral target has no script chunk format it can pick
// on its own, so this one says which.
/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "node", "es5"],
	output: {
		chunkFormat: "array-push",
		chunkLoading: "jsonp",
		chunkFilename: "[name].js"
	},
	optimization: {
		chunkIds: "named"
	}
};
