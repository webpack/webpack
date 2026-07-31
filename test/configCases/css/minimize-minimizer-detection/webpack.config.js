"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const { BannerPlugin, LoaderOptionsPlugin } = require("../../../../");

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
		// None of these claim CSS or HTML: two real minimizers whose matchers cover
		// other types, and a plugin function with no options at all.
		minimizer: [
			"...",
			new MinimizerPlugin({ test: /\.[cm]?js(\?.*)?$/i }),
			new MinimizerPlugin({ test: /\.json$/i, include: /\.txt$/i }),
			(compiler) => {
				compiler.hooks.done.tap("NoopMinimizer", () => {});
			}
		]
	},
	plugins: [
		// Real plugins that carry `test`/`include`/`exclude` without being
		// minimizers: `LoaderOptionsPlugin` defaults `test` to match every file,
		// and a `BannerPlugin` scoped to CSS matches the probe name.
		new LoaderOptionsPlugin({}),
		new BannerPlugin({ banner: "banner", test: /\.css$/i }),
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
