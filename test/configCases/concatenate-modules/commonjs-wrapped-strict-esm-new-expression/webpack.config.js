"use strict";

const PLUGIN_NAME = "SnapshotBundlePlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	devtool: false,
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		/**
		 * `new` on a wrapped module's accessor call is printed code, so the whole
		 * emitted bundle is reviewed as one rather than pinned substring by substring.
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
