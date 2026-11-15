"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("./currentWatchStep");

/** @import { Compiler } from "webpack" */
/**
 * @typedef {object} WatchMutation
 * @property {string} name fault being introduced
 * @property {"graph" | "comparison"} detector expected failure
 * @property {"graph" | "invalidation" | "recovery"} fault fault to inject
 */

/**
 * Injects one watch fault to verify that the runner detects it and can retry.
 * @param {WatchMutation} mutation fault to inject
 * @returns {{ apply: (compiler: Compiler) => void, check: (error: Error) => void, failures: () => number }} fault injection and recovery assertions
 */
const createWatchMutation = (mutation) => {
	let hits = 0;
	let failures = 0;
	/** @type {Error[]} */
	let previousErrors = [];
	/** @returns {boolean} whether the next rebuild should contain the fault */
	const shouldMutate = () =>
		currentWatchStep.step === "1" && hits === 0 && failures === 0;
	return {
		/**
		 * @param {Compiler} compiler watched compiler
		 * @returns {void}
		 */
		apply(compiler) {
			compiler.hooks.compilation.tap("WatchMutation", (compilation) => {
				if (!compiler.watchMode || mutation.fault !== "invalidation") return;
				compilation.buildQueue.hooks.beforeStart.tap(
					"WatchMutation",
					(module) => {
						if (
							!shouldMutate() ||
							module.nameForCondition() !==
								path.join(compiler.context, "value.js")
						) {
							return;
						}
						const needBuild = module.needBuild;
						module.needBuild = (_context, callback) => {
							module.needBuild = needBuild;
							hits++;
							callback(null, false);
						};
					}
				);
			});
			compiler.hooks.finishMake.tap("WatchMutation", (compilation) => {
				if (
					!compiler.watchMode ||
					mutation.fault !== "graph" ||
					!shouldMutate()
				) {
					return;
				}
				const origin = [...compilation.modules].find(
					(module) =>
						module.nameForCondition() ===
						path.join(compiler.context, "branch.js")
				);
				const target = [...compilation.modules].find(
					(module) =>
						module.nameForCondition() === path.join(compiler.context, "new.js")
				);
				assert(origin && target, mutation.name);
				const dependency = new compiler.webpack.Dependency();
				compilation.moduleGraph.setParents(dependency, origin, origin);
				compilation.moduleGraph.setResolvedModule(origin, dependency, target);
				hits++;
			});
			compiler.hooks.afterCompile.tap("WatchMutation", (compilation) => {
				if (!compiler.watchMode || mutation.fault !== "recovery") return;
				if (currentWatchStep.step === "0") {
					previousErrors = [...compilation.errors];
				} else if (shouldMutate()) {
					expect(previousErrors).toHaveLength(1);
					compilation.errors.push(...previousErrors);
					hits++;
				}
			});
		},
		/**
		 * @param {Error} error expected failure detected by the watch runner
		 * @returns {void}
		 */
		check(error) {
			expect(failures).toBe(0);
			expect(hits).toBe(1);
			if (mutation.detector === "graph") {
				expect(error).toBeInstanceOf(assert.AssertionError);
				expect(error.message).toMatch(/branch\.js: stale outgoing dependency$/);
			} else {
				expect(
					/** @type {Error & { matcherResult?: { pass: boolean, name: string } }} */ (
						error
					).matcherResult
				).toMatchObject({ name: "toEqual", pass: false });
			}
			failures++;
		},
		/** @returns {number} detected mutations */
		failures: () => failures
	};
};

module.exports = createWatchMutation;
