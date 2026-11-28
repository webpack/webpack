"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, ModuleGraph } from "webpack" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	cache: { type: "filesystem" },
	experiments: { incremental: true },
	optimization: { sideEffects: false, concatenateModules: false },
	plugins: [
		(compiler) => {
			let warmed = false;
			/** @type {ModuleGraph | undefined} */
			let previousGraph;
			compiler.hooks.beforeCompile.tapAsync(
				"WarmIncrementalCache",
				(_params, done) => {
					if (warmed || !compiler.watchMode) return done();
					warmed = true;
					const warmCompiler = compiler.webpack({
						mode: "development",
						context: compiler.context,
						entry: "./cached.js",
						cache: false,
						target: compiler.options.target,
						optimization: { sideEffects: false, concatenateModules: false },
						output: { path: path.join(compiler.outputPath, "warm") }
					});
					if (!warmCompiler) return done(new Error("Expected a compiler"));
					warmCompiler.run((error, stats) => {
						warmCompiler.close((closeError) => {
							if (error || closeError) return done(error || closeError);
							if (!stats || stats.hasErrors()) {
								return done(new Error("Cache warmup failed"));
							}
							const cached = [...stats.compilation.modules].find(
								(module) =>
									module.nameForCondition() ===
									path.join(compiler.context, "cached.js")
							);
							if (!cached) return done(new Error("Expected the warm module"));
							compiler
								.getCache("Compilation/modules")
								.store(cached.identifier(), null, cached, done);
						});
					});
				}
			);
			compiler.hooks.finishMake.tap("CheckCachedSubtree", (compilation) => {
				if (!compiler.watchMode) return;
				if (currentWatchStep.step === "1") {
					expect(compilation.moduleGraph === previousGraph).toBe(
						compiler.options.experiments.incremental === true
					);
					const cached = [...compilation.modules].find(
						(module) =>
							module.nameForCondition() ===
							path.join(compiler.context, "cached.js")
					);
					if (!cached) throw new Error("Expected the cached module");
					expect(compilation.builtModules.has(cached)).toBe(false);
					expect([
						...compilation.moduleGraph.getOutgoingConnections(cached)
					]).toHaveLength(1);
				}
				previousGraph = compilation.moduleGraph;
			});
		}
	]
};
