"use strict";

const path = require("path");

const PLUGIN_NAME = "SnapshotBundlePlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	devtool: false,
	resolve: {
		modules: [path.resolve(__dirname, "vendor"), "node_modules"]
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
					expect(assets["bundle0.js"].source()).toMatchSnapshot();
				});
			});
		}
	]
};
