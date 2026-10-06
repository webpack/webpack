"use strict";

const { EnvironmentPlugin } = require("../../../../");
const currentWatchStep = require("../../../helpers/currentWatchStep");

const step = () => Number(currentWatchStep.step);

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: { type: "filesystem" },
	optimization: { minimize: false },
	plugins: [
		(compiler) => {
			// EnvironmentPlugin reads the variable while compiling
			const name = "WEBPACK_TEST_RESTORED_INLINE";
			process.env[name] = ["on", "off"][step()];
			const clear = () => {
				delete process.env[name];
			};
			compiler.hooks.done.tap("RestoredEnvironmentPlugin", clear);
			compiler.hooks.failed.tap("RestoredEnvironmentPlugin", clear);
			new EnvironmentPlugin([name]).apply(compiler);
		}
	]
};
