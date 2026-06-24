"use strict";

// A native `<script type="module" src>` entry that gains a sibling chunk (the
// split-out runtime) exercises the in-place `type="module"` rewrite: the parser
// captures the original `type` value range and the sibling-clone template
// overwrites it instead of re-parsing the tag. `output.module` keeps the whole
// graph ESM so the cloned module tag is consistent with the entry tag. The
// `runtimeChunk` name function only splits the synthetic `__html_*` entries, so
// the test's own bundle keeps its inline runtime and stays loadable.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	node: {
		__dirname: false,
		__filename: false
	},
	externalsPresets: {
		node: true
	},
	module: {
		parser: {
			javascript: {
				importMeta: false
			}
		}
	},
	output: {
		filename: "[name].mjs",
		chunkFilename: "[name].chunk.mjs",
		module: true
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: {
			name: (entrypoint) =>
				entrypoint.name.startsWith("__html_") ? "html-runtime" : undefined
		}
	},
	experiments: {
		html: true,
		outputModule: true
	}
};
