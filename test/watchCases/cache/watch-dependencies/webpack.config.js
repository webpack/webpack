"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @returns {import("../../../..").Configuration} watch configuration */
module.exports = () => {
	/** @type {Set<string | undefined>} */
	const detected = new Set();
	/** @type {string | undefined} */
	let expectedDependency;
	const plugin = {
		detected,
		/**
		 * @param {Error} error comparison failure
		 * @returns {void}
		 */
		check(error) {
			const step = currentWatchStep.step;
			expect(detected.has(step)).toBe(false);
			expect(expectedDependency).toBeDefined();
			expect(error.message).toContain(expectedDependency);
			detected.add(step);
		},
		/**
		 * @param {import("../../../..").Compiler} compiler watched compiler
		 * @returns {void}
		 */
		apply(compiler) {
			compiler.hooks.afterCompile.tap("WatchDependencies", (compilation) => {
				const dependencies = /** @type {const} */ ([
					["fileDependencies", path.join(compiler.context, "watched-file.txt")],
					[
						"contextDependencies",
						path.join(compiler.context, "watched-directory")
					],
					[
						"missingDependencies",
						path.join(compiler.context, "watched-missing.txt")
					]
				]);
				for (const [kind, dependency] of dependencies) {
					compilation[kind].add(dependency);
				}
				compilation.missingDependencies.add(
					path.join(compiler.outputPath, "watched-output.txt")
				);
				const step = currentWatchStep.step;
				if (!compiler.watchMode || step === "0" || detected.has(step)) return;
				const index = Number(step) - 1;
				const [kind, dependency] = dependencies[index % dependencies.length];
				expectedDependency = path.basename(dependency);
				if (index < dependencies.length) {
					compilation[kind].delete(dependency);
				} else {
					compilation[kind].add(`${dependency}.extra`);
				}
			});
		}
	};
	return { devtool: false, plugins: [plugin] };
};
