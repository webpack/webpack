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
 * A `<style lang>` / `<script lang>` body is a virtual file beside its page
 * with the `lang` as extension, so the rules for that language's files apply;
 * `with: { lang }` matches the attribute as written.
 * @type {import("../../../../").Configuration}
 */
module.exports = {
	devtool: false,
	entry: {
		main: ["./index.js", "./page.html"]
	},
	output: {
		filename: "[name].js",
		assetModuleFilename: "handled-[name][ext]"
	},
	module: {
		rules: [
			{ test: /\.less$/, use: lessLoader },
			{ test: /\.scss$/, use: variablesLoader("by-scss-rule") },
			{ test: /\.styl$/, use: variablesLoader("by-stylus-rule") },
			{ test: /\.postcss$/, use: variablesLoader("by-postcss-rule") },
			{ with: { lang: "no extension" }, use: variablesLoader("by-with-rule") },
			{ test: /\.upper$/, use: path.resolve(__dirname, "upper-loader.js") }
		]
	},
	experiments: {
		html: true,
		css: true
	}
};
