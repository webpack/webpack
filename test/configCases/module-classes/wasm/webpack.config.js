"use strict";

const AsyncWasmModule = require("../../../../lib/wasm-async/AsyncWasmModule");
const SyncWasmModule = require("../../../../lib/wasm-sync/SyncWasmModule");

/** @type {Map<string, { new (...args: EXPECTED_ANY[]): EXPECTED_ANY }>} */
const expectedClasses = new Map([
	["webassembly/async", AsyncWasmModule],
	["webassembly/sync", SyncWasmModule]
]);

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /[\\/]async\.wat$/,
				loader: "wast-loader",
				type: "webassembly/async"
			},
			{
				test: /[\\/]sync\.wat$/,
				loader: "wast-loader",
				type: "webassembly/sync"
			}
		]
	},
	experiments: {
		asyncWebAssembly: true,
		syncWebAssembly: true
	},
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("Test", (compilation) => {
				compilation.hooks.finishModules.tap("Test", (modules) => {
					for (const module of modules) {
						const ExpectedClass = expectedClasses.get(module.type);
						if (ExpectedClass && !(module instanceof ExpectedClass)) {
							throw new Error(
								`${module.identifier()} (${module.type}) is not an instance of ${ExpectedClass.name}`
							);
						}
					}
				});
			});
		}
	]
};
