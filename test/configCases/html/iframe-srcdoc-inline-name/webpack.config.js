"use strict";

// An `<iframe srcdoc>` is a page webpack writes, so it has no file of its own.
// Its inline `<script>` has no url either, and takes the embedding page's name.

/** @type {import("../../../../").Configuration} */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		pathinfo: false
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
