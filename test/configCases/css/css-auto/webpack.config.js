"use strict";

// Bun aborts in its node:vm SourceTextModule.link() and Deno hard-panics
// ("Module not found") on less-loader's `import("less")`; on both load the CJS
// less so it skips the dynamic import.
const lessLoader =
	process.versions.bun || process.versions.deno
		? { loader: "less-loader", options: { implementation: require("less") } }
		: "less-loader";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	experiments: {
		css: true
	},
	module: {
		rules: [
			{
				test: /\.less$/,
				use: lessLoader,
				type: "css/auto"
			}
		]
	}
};
