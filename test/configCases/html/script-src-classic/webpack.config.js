"use strict";

/** @import { Configuration } from "../../../../" */

// No `output.module` — emitted chunks are
// classic IIFE-wrapped scripts. The parser must NOT auto-upgrade
// `<script src>` to `<script type="module" src>` in this mode.

/** @type {Configuration} */
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
