"use strict";

// Neither an `<iframe srcdoc>` page nor an inline `<script>` carries a url, so
// the extracted entry keeps the name webpack gave it.

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
