"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../../../../");

// Declares JSON through `include`, but its `test` keeps it to JavaScript, so the
// plugin never hands it a JSON asset and webpack's own minimizer must.
class JavascriptOnlyMinimizer {
	constructor() {
		this.options = {
			test: /\.js$/,
			include: /\.json$/,
			minimizer: { implementation: () => {} }
		};
	}

	apply() {}
}

/** @typedef {"minified" | "unchanged" | "user"} Expected */

/**
 * @param {string} name asset name prefix
 * @param {Expected} expected what the emitted JSON asset should hold
 * @param {import("../../../../").Configuration} options config overrides
 * @returns {import("../../../../").Configuration} config
 */
const config = (name, expected, options) => ({
	target: "node",
	mode: "production",
	...options,
	optimization: {
		// The test harness turns minimizing off and swaps in its own minimizer.
		minimize: true,
		minimizer: ["..."],
		...options.optimization
	},
	output: {
		publicPath: "",
		assetModuleFilename: `${name}-[name][ext]`
	},
	module: {
		rules: [{ test: /\.json$/, type: "asset/resource" }]
	},
	plugins: [
		...(options.plugins || []),
		new webpack.DefinePlugin({ EXPECTED: JSON.stringify(expected) })
	]
});

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	config("future-defaults", "minified", {
		experiments: { futureDefaults: true }
	}),
	config("future-defaults-disabled", "unchanged", {
		experiments: { futureDefaults: true },
		optimization: { minimizeOptions: { json: false } }
	}),
	config("default", "unchanged", {}),
	config("opt-in", "minified", {
		optimization: { minimizeOptions: { json: true } }
	}),
	config("test-and-include", "minified", {
		experiments: { futureDefaults: true },
		optimization: { minimizer: ["...", new JavascriptOnlyMinimizer()] }
	}),
	config("user-minimizer", "user", {
		experiments: { futureDefaults: true },
		optimization: {
			// Listed after the default one, so without stepping aside the default
			// would minimize first and this one would skip the asset.
			minimizer: [
				"...",
				new MinimizerPlugin({
					test: /\.json$/,
					exclude: /not-json/,
					minify: MinimizerPlugin.jsonMinify,
					minimizerOptions: { space: 1 }
				})
			]
		}
	})
];
