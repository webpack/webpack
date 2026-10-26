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
 * @param {string} marker class the loader appends, naming the rule that ran
 * @returns {import("../../../../").RuleSetUseItem} the stand-in loader
 */
const variablesLoader = (marker) => ({
	loader: path.resolve(__dirname, "variables-loader.js"),
	options: { marker }
});

/**
 * A `<style lang>` body is a `data:` module typed as mime-db types the
 * language's files, so a `mimetype` rule runs that language's loader on it.
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
			{ mimetype: "text/less", use: lessLoader },
			{ mimetype: "text/x-scss", use: variablesLoader("by-scss-rule") },
			{ mimetype: "text/stylus", use: variablesLoader("by-stylus-rule") },
			{ mimetype: "text/x-postcss", use: variablesLoader("by-postcss-rule") }
		]
	},
	experiments: {
		html: true,
		css: true
	}
};
