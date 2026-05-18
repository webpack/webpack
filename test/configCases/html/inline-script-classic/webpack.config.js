"use strict";

// No `experiments.outputModule` and no `output.module` — emitted chunks are
// classic IIFE-wrapped scripts. In this mode the parser must NOT auto-
// upgrade classic inline `<script>` to `<script type="module" src>`, AND
// it must DROP `type="module"` from inline `<script type="module">` so
// the browser doesn't load the classic chunk under module semantics.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	output: {
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named"
	},
	experiments: {
		html: true
	}
};
