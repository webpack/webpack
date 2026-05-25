"use strict";

// Under `output.module` the emitted chunks are ESM, so a custom element
// mapped to `type: "script"` must get `type="module"` sibling tags for its
// runtime/split chunks — its entry chunk is ESM too, and a classic `<script>`
// sibling would fail to load an ES module. Regression test for the
// `willBeModuleScript` derivation no longer requiring a native `<script>`.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js"
	},
	optimization: {
		chunkIds: "named",
		runtimeChunk: {
			name: (entrypoint) =>
				entrypoint.name.startsWith("__html_")
					? `${entrypoint.name}-runtime`
					: undefined
		}
	},
	module: {
		parser: {
			html: {
				sources: ["...", { tag: "my-script", attribute: "src", type: "script" }]
			}
		}
	},
	experiments: {
		html: true,
		outputModule: true
	}
};
