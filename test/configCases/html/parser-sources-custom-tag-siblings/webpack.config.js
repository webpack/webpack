"use strict";

// Regression test for sibling-tag emission when a custom (non-`<script>`)
// element is mapped to a `script` / `script-module` source type. With
// `runtimeChunk` splitting a runtime chunk out of each synthetic html entry,
// the template must emit *real* `<script>` siblings for the extra chunks —
// cloning the custom element and appending `</script>` would produce invalid,
// non-executing markup like `<my-script …></script>`.

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
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
				sources: [
					"...",
					{ tag: "my-script", attribute: "src", type: "script" },
					{ tag: "my-module", attribute: "src", type: "script-module" }
				]
			}
		}
	},
	experiments: {
		html: true
	}
};
