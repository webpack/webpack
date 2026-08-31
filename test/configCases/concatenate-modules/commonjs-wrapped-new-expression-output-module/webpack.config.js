"use strict";

const PLUGIN_NAME = "SnapshotBundlePlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	devtool: false,
	experiments: {
		outputModule: true
	},
	optimization: {
		concatenateModules: { commonjs: true },
		minimize: false,
		usedExports: true,
		moduleIds: "named",
		chunkIds: "named"
	},
	plugins: [
		/**
		 * What this case checks is printed code, so review the bundle as a whole.
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterProcessAssets.tap(PLUGIN_NAME, (assets) => {
					expect(assets["bundle0.mjs"].source()).toMatchSnapshot();
				});
			});
		}
	]
};
