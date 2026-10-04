"use strict";

const assert = require("assert");
const path = require("path");
const createIncrementalMutation = require("../../../helpers/createIncrementalMutation");
const createWatchTestSession = require("../../../helpers/watchTestSession");

/** @import { FileChanges, ScenarioOptions } from "../../../helpers/watchTestSession" */
/** @import { IncrementalMutation } from "../../../helpers/createIncrementalMutation" */
/** @import { Compiler } from "../../../.." */
/** @typedef {{ files: FileChanges, errors: boolean, value?: number }} Step */
/** @typedef {IncrementalMutation & { steps: Step[], detector: "graph" | "comparison" }} MutationCase */
/** @typedef {Error & { matcherResult?: { pass: boolean, name: string } }} ComparisonError */

/** @type {MutationCase[]} */
const cases = [
	{
		name: "ignored invalidation",
		detector: "comparison",
		method: "_rebuild",
		before: "if (need) {",
		after: "if (need && (recordMutation(), false)) {",
		steps: [
			{
				files: {
					"index.js": 'module.exports = require("./value");',
					"value.js": "module.exports = 1;"
				},
				errors: false,
				value: 1
			},
			{ files: { "value.js": "module.exports = 2;" }, errors: false, value: 2 }
		]
	},
	{
		name: "stale outgoing connections",
		detector: "graph",
		method: "removePreRebuildConnections",
		before:
			"this._compilation.removeReasonsOfDependencyBlock(module, staleReferences);",
		after: "recordMutation(); return;",
		steps: [
			{
				files: {
					"index.js": 'module.exports = require("./branch");',
					"branch.js": 'module.exports = require("./old");',
					"old.js": "module.exports = 1;",
					"new.js": "module.exports = 2;"
				},
				errors: false,
				value: 1
			},
			{
				files: { "branch.js": 'module.exports = require("./new");' },
				errors: false,
				value: 2
			}
		]
	},
	{
		name: "missing error recovery",
		detector: "comparison",
		method: "_rebuild",
		before: "if (this.errorModules.size > 0) {",
		after: "if (this.errorModules.size > 0 && (recordMutation(), false)) {",
		steps: [
			{
				files: { "index.js": 'module.exports = require("./missing");' },
				errors: true
			},
			{
				files: { "missing.js": "module.exports = 42;" },
				errors: false,
				value: 42
			}
		]
	}
];

/**
 * @param {ScenarioOptions} options suite options
 * @returns {void}
 */
module.exports = (options) => {
	for (const mode of /** @type {const} */ (["development", "production"])) {
		it(`should accept weak plugin connections without dependency parents in ${mode}`, async () => {
			const session = createWatchTestSession(
				path.join(options.directory, mode, "plugin-connections"),
				{
					mode,
					experiments: options.experiments,
					optimization: { minimize: false },
					plugins: [
						(compiler) => {
							compiler.hooks.finishMake.tap(
								{ name: "PluginConnection", stage: -1 },
								(compilation) => {
									for (const module of compilation.modules) {
										const dependency =
											new compiler.webpack.dependencies.ModuleDependency(
												module.identifier()
											);
										dependency.weak = true;
										compilation.moduleGraph.setResolvedModule(
											module,
											dependency,
											module
										);
										expect(
											compilation.moduleGraph.getParentModule(dependency)
										).toBeUndefined();
									}
								}
							);
						}
					]
				}
			);
			try {
				session.write({ "index.js": "module.exports = 42;" });
				await session.compare(await session.start());
				expect(session.readExports()).toBe(42);
			} finally {
				await session.close();
			}
		});
		for (const mutationCase of cases) {
			it(`should detect ${mutationCase.name} in ${mode}`, async () => {
				/**
				 * @param {string} name isolated run name
				 * @param {((compiler: Compiler) => void)[]} plugins fault injection plugins
				 * @returns {Promise<{ step: number, detector: "graph" | "comparison", error: ComparisonError } | undefined>} first detected regression
				 */
				const replay = async (name, plugins) => {
					const session = createWatchTestSession(
						path.join(options.directory, mode, mutationCase.name, name),
						{
							mode,
							experiments: options.experiments,
							cache: { type: mode === "development" ? "memory" : "filesystem" },
							optimization: {
								minimize: false,
								moduleIds: "named",
								chunkIds: "named"
							},
							plugins
						}
					);
					try {
						for (let step = 0; step < mutationCase.steps.length; step++) {
							const expected = mutationCase.steps[step];
							session.write(expected.files);
							/** @type {import("../../../..").Stats} */
							let stats;
							try {
								stats =
									step === 0
										? await session.start()
										: (
												await Promise.all([
													session.nextBuild(),
													session.invalidate()
												])
											)[0];
							} catch (error) {
								if (
									error instanceof assert.AssertionError &&
									error.message.endsWith(": stale outgoing dependency")
								) {
									return { step, detector: "graph", error };
								}
								throw error;
							}
							try {
								await session.compare(stats);
							} catch (error) {
								return {
									step,
									detector: "comparison",
									error: /** @type {ComparisonError} */ (error)
								};
							}
							expect(stats.hasErrors()).toBe(expected.errors);
							if (!expected.errors)
								expect(session.readExports()).toBe(expected.value);
						}
					} finally {
						await session.close();
					}
				};
				const control = await replay("control", []);
				if (control) throw control.error;
				const mutation = createIncrementalMutation(mutationCase);
				const failure = await replay("mutated", [mutation.plugin]);
				expect(mutation.hits()).toBeGreaterThan(0);
				expect(failure).toBeDefined();
				if (!failure)
					throw new Error(`${mutationCase.name}: mutation survived`);
				expect(failure.step).toBe(1);
				expect(failure.detector).toBe(mutationCase.detector);
				if (failure.detector === "comparison") {
					expect(failure.error.matcherResult).toMatchObject({
						name: "toEqual",
						pass: false
					});
				} else {
					expect(failure.error.message).toMatch(
						/branch\.js: stale outgoing dependency$/
					);
				}
			}, 30000);
		}
	}
};
