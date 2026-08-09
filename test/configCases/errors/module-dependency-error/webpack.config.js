"use strict";

const ModuleDependencyError = require("../../../../lib/errors/ModuleDependencyError");

const PLUGIN_NAME = "AssertModuleDependencyErrorPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		strictExportPresence: true
	},
	plugins: [
		/**
		 * A dependency error is wrapped so it carries the module and the location
		 * it came from; the message stays the nested error's own.
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterSeal.tapPromise(PLUGIN_NAME, async () => {
					const error = compilation.errors[0];
					if (!(error instanceof ModuleDependencyError)) {
						throw new Error(`expected a ModuleDependencyError, got ${error}`);
					}
					if (error.name !== "ModuleDependencyError") {
						throw new Error(`unexpected name ${error.name}`);
					}
					const module = error.module;
					if (!module || !module.identifier().endsWith("index.js")) {
						throw new Error(`unexpected module ${module}`);
					}
					if (error.message !== error.error.message) {
						throw new Error("message must be the nested error's own");
					}
					if (!error.loc || !("start" in error.loc)) {
						throw new Error(`unexpected loc ${JSON.stringify(error.loc)}`);
					}
				});
			});
		}
	]
};
