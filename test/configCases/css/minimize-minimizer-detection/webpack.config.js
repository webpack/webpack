"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");

// A plugin carrying an `options` object that is not an asset matcher — reading
// it as one would match every file and claim every type.
class PluginWithUnrelatedOptions {
	constructor() {
		this.options = { filename: "[name].css" };
	}

	apply() {}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		filename: "[name].js",
		pathinfo: false
	},
	module: {
		generator: {
			html: {
				extract: true
			}
		}
	},
	optimization: {
		minimize: true,
		// None of these claim CSS or HTML: the default JS minimizer's matcher only
		// covers `.js`, the `exclude` cancels the `.html` matcher for the probe
		// name, and a plugin function has no options at all.
		minimizer: [
			"...",
			new MinimizerPlugin({ test: /\.[cm]?js(\?.*)?$/i }),
			new MinimizerPlugin({ test: /\.html$/i, exclude: /file/ }),
			(compiler) => {
				compiler.hooks.done.tap("NoopMinimizer", () => {});
			}
		]
	},
	plugins: [
		new PluginWithUnrelatedOptions(),
		// An `include`-only matcher that resolves to a different type.
		{
			options: { include: /\.svg$/i },
			apply() {}
		},
		{
			apply() {}
		}
	],
	experiments: {
		css: true,
		html: true
	}
};
