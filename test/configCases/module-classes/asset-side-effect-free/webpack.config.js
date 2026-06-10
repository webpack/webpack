"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	experiments: {
		futureDefaults: true
	},
	module: {
		rules: [{ test: /\.png$/, type: "asset/resource" }]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.finishModules.tap("Test", (modules) => {
					for (const module of modules) {
						if (!module.type.startsWith("asset")) continue;
						if (
							!module.factoryMeta ||
							module.factoryMeta.sideEffectFree !== true
						) {
							throw new Error(
								`${module.identifier()} should have factoryMeta.sideEffectFree === true`
							);
						}
					}
				});
			});
		}
	]
};
