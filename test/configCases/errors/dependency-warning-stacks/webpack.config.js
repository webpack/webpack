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
					let assignedUnread = false;
					for (const item of compilation.warnings) {
						const warning =
							/** @type {import("../../../../").WebpackError} */
							(item);
						const details = warning.details;
						if (details) {
							warning.details = `overridden ${details.split("\n")[0].trim()}`;
						} else if (!assignedUnread) {
							// assigning before the first read must win over the derived stack
							assignedUnread = true;
							warning.stack = "overridden unread stack";
						} else {
							const stack = /** @type {string} */ (warning.stack);
							// reading must be stable — the engine may replace the own
							// `stack` property while the derived one is materialized
							if (warning.stack !== stack) {
								throw new Error("derived stack changed between reads");
							}
							warning.stack = `overridden ${stack.split("\n\n")[1]}`;
						}
					}
				});
			});
		}
	]
};
