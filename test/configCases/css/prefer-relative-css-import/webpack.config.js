"use strict";

// Bun aborts in its node:vm SourceTextModule.link() on less-loader's
// `import("less")`; under Bun load the CJS less so it skips the dynamic import.
const lessLoader = process.versions.bun
	? { loader: "less-loader", options: { implementation: require("less") } }
	: "less-loader";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "development",
	module: {
		rules: [
			{
				test: /\.less$/,
				use: lessLoader,
				type: "css/auto"
			}
		]
	},
	experiments: {
		css: true
	}
};
