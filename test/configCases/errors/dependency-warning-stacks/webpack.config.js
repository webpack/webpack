"use strict";

const PLUGIN_NAME = "RewriteWarningDiagnosticsPlugin";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	plugins: [
		/**
		 * Rewrites the derived diagnostics the way `DefinePlugin` does — an
		 * assignment must win over the value derived from the nested error.
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
				compilation.hooks.afterSeal.tapPromise(PLUGIN_NAME, async () => {
					for (const item of compilation.warnings) {
						const warning =
							/** @type {import("../../../../").WebpackError} */
							(item);
						const details = warning.details;
						if (details) {
							warning.details = `overridden ${details.split("\n")[0].trim()}`;
						} else {
							const stack = /** @type {string} */ (warning.stack);
							warning.stack = `overridden ${stack.split("\n\n")[1]}`;
						}
					}
				});
			});
		}
	]
};
