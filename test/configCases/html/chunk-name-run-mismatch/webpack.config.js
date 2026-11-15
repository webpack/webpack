"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		main: "./index.js",
		owner: "./owner.html",
		subset: "./subset.html",
		reordered: "./reordered.html"
	},
	output: { filename: "[name].js", htmlFilename: "[name].html" },
	// Emitted anyway, so the test reads what the name holds.
	optimization: { emitOnErrors: true },
	experiments: { html: true }
};
