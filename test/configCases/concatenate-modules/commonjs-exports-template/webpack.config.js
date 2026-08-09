"use strict";

const PLUGIN_NAME = "SnapshotBundlePlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	optimization: {
		concatenateModules: true,
		mangleExports: false,
		minimize: false,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		/**
		 * The CommonJS exports templates render the same code inside the lazy
		 * concatenation wrapper as they do for a standalone module.
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, (assets) => {
					expect(assets["bundle0.js"].source()).toMatchSnapshot();
				});
			});
		}
	]
};
