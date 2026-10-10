"use strict";

const PLUGIN_NAME = "PrepareRetainedModuleTypeTest";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [{ test: /\.txt$/, type: "asset/source" }]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				PLUGIN_NAME,
				(compilation, { normalModuleFactory }) => {
					let prepared = false;
					let prepareCalls = 0;
					normalModuleFactory.hooks.prepareModuleType
						.for("asset/source")
						.tapAsync(PLUGIN_NAME, (callback) => {
							prepareCalls++;
							setImmediate(() => {
								prepared = true;
								callback();
							});
						});
					normalModuleFactory.hooks.parser
						.for("asset/source")
						.tap(PLUGIN_NAME, () => {
							expect(prepared).toBe(true);
						});
					compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
						expect(prepared).toBe(true);
						expect(prepareCalls).toBe(1);
					});
				}
			);
		}
	]
};
