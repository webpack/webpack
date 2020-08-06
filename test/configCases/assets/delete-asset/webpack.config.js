const { Compilation } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		chunkIds: "named"
	},
	devtool: "source-map",
	plugins: [
		compiler => {
			compiler.hooks.compilation.tap("Test", compilation => {
				compilation.hooks.processAssets.tap(
					{
						name: "Test",
						stage: Compilation.PROCESS_ASSETS_STAGE_ANALYSE
					},
					() => {
						expect(compilation.getAsset("chunk_js.bundle0.js")).not.toBe(
							undefined
						);
						expect(compilation.getAsset("chunk_js.bundle0.js.map")).not.toBe(
							undefined
						);
						compilation.deleteAsset("chunk_js.bundle0.js");
						expect(compilation.getAsset("chunk_js.bundle0.js")).toBe(undefined);
						expect(compilation.getAsset("chunk_js.bundle0.js.map")).toBe(
							undefined
						);
					}
				);
			});
		}
	]
};
