"use strict";

const path = require("path");

// Bun aborts in its node:vm SourceTextModule.link() and Deno hard-panics
// ("Module not found") on less-loader's `import("less")`; on both load the CJS
// less so it skips the dynamic import.
const lessLoader =
	process.versions.bun || process.versions.deno
		? { loader: "less-loader", options: { implementation: require("less") } }
		: "less-loader";

/**
 * A `<style lang="…">` body is a `data:text/x-<lang>` module, so a `mimetype`
 * rule runs that language's loader on it and on no other `<style>`.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	devtool: false,
	target: "web",
	output: {
		assetModuleFilename: "handled-[name][ext]"
	},
	module: {
		rules: [
			{ mimetype: "text/x-less", use: lessLoader },
			{
				mimetype: "text/x-scss",
				use: path.resolve(__dirname, "scss-loader.js")
			}
		]
	},
	experiments: {
		html: true,
		css: true
	}
};
