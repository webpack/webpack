"use strict";

const MinimizerPlugin = require("minimizer-webpack-plugin");
const { sources } = require("../../../../");

class EmitCopiedCssPlugin {
	/**
	 * @param {import("../../../../").Compiler} compiler compiler
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("EmitCopiedCssPlugin", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "EmitCopiedCssPlugin",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(
						"copied.css",
						new sources.RawSource(".copied {\n\tcolor : red ;\n}\n")
					);
				}
			);
		});
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	mode: "production",
	output: {
		pathinfo: false
	},
	optimization: {
		minimize: true,
		// `"..."` is webpack's own default minimizer; the entry after it already
		// claims `.css`, so webpack must not attach its built-in CSS minifier.
		minimizer: [
			"...",
			new MinimizerPlugin({
				test: /\.css$/i,
				minify: (input) => ({ code: `/*user*/${Object.values(input)[0]}` }),
				minimizerOptions: {}
			})
		]
	},
	plugins: [new EmitCopiedCssPlugin()],
	experiments: {
		css: true
	}
};
