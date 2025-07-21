"use strict";

const { Compilation } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	optimization: {
		minimize: true,
		chunkIds: "named"
	},
	devtool: "source-map",
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.processAssets.tap(
					{
						name: "Test",
						stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE
					},
					() => {
						compilation.updateAsset(
							"module_js.bundle0.js",
							compilation.assets["module_js.bundle0.js"],
							{ related: { sourceMap: null } }
						);
						compilation.deleteAsset("module_js.bundle0.js");
					}
				);
			});
		}
	]
};
