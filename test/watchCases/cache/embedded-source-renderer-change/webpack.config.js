"use strict";

const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	experiments: { css: true },
	module: {
		rules: [
			{ test: /\.css$/, type: "css/auto", parser: { exportType: "text" } }
		]
	},
	plugins: [
		// A renderer whose output and hash follow its marker, as a minimizer's
		// do its options; the marker changes while the stylesheet does not.
		(compiler) => {
			const marker = () => ["first", "second"][Number(currentWatchStep.step)];
			compiler.hooks.compilation.tap("MarkerMinifier", (compilation) => {
				compilation.hooks.renderEmbeddedSource.tap(
					"MarkerMinifier",
					(source) =>
						new compiler.webpack.sources.RawSource(
							`/*${marker()}*/${/** @type {string} */ (source.source())}`
						)
				);
				compilation.hooks.embeddedSourceHash.tap(
					"MarkerMinifier",
					(_module, hash) => hash.update(marker())
				);
			});
		}
	]
};
