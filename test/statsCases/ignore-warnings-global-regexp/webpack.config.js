"use strict";

/** @import { Compiler, Configuration } from "../../../" */

class RepeatedWarningsPlugin {
	/**
	 * @param {Compiler} compiler compiler
	 */
	apply(compiler) {
		const { WebpackError } = compiler.webpack;
		compiler.hooks.thisCompilation.tap(
			"RepeatedWarningsPlugin",
			(compilation) => {
				compilation.hooks.afterSeal.tap("RepeatedWarningsPlugin", () => {
					const target = [...compilation.modules].find((module) =>
						module.identifier().includes("module.js")
					);
					// Identical warnings in a row: a global or sticky regexp that
					// resumes at `lastIndex` would match only every other one.
					for (let i = 0; i < 3; i++) {
						compilation.warnings.push(new WebpackError("alpha warning"));
						const beta = new WebpackError("beta warning");
						beta.file = "beta.js";
						compilation.warnings.push(beta);
						const gamma = new WebpackError("gamma warning");
						gamma.module = target;
						compilation.warnings.push(gamma);
						compilation.warnings.push(new WebpackError("sticky warning"));
						compilation.warnings.push(new WebpackError("kept warning"));
					}
					for (let i = 0; i < 3; i++) {
						compilation.warnings.push(new WebpackError("delta warning"));
					}
				});
			}
		);
	}
}

/** @type {Configuration} */
module.exports = {
	mode: "production",
	entry: "./index.js",
	plugins: [new RepeatedWarningsPlugin()],
	ignoreWarnings: [
		{ message: /alpha warning/g },
		{ file: /beta\.js/g },
		{ module: /module\.js/g },
		/sticky warning/y
	],
	stats: {
		modules: true,
		orphanModules: true,
		excludeModules: [/module\.js/g],
		warningsFilter: [/delta warning/g]
	}
};
