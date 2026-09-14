"use strict";

const PLUGIN_NAME = "LegacyCompatChunkHandlerTestPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "node",
	output: { filename: "[name].js" },
	optimization: { runtimeChunk: "single", chunkIds: "named" },
	plugins: [
		{
			apply(compiler) {
				compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
					// A legacy main template hook emits whatever a plugin taps it with, so
					// the handler below is one nothing in webpack can name ahead of time.
					compilation.mainTemplate.hooks.requireExtensions.tap(
						PLUGIN_NAME,
						(source) =>
							`${source}\n__webpack_require__.f.legacy = function(chunkId, promises) { global.__legacyHandlerCalled = true; };`
					);
				});
			}
		}
	]
};
