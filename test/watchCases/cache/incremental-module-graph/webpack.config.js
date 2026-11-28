"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @import { Configuration, ModuleGraph, ModuleGraphConnection } from "webpack" */

/** @type {Configuration[]} */
module.exports = [
	false,
	"memory",
	"filesystem",
	"disabled",
	"loader",
	"dynamic",
	"optimized"
].map((cacheType, index) => ({
	mode: "development",
	entry: cacheType === "dynamic" ? () => "./index.js" : "./index.js",
	module:
		cacheType === "loader"
			? {
					rules: [
						{ test: /value\.js$/, use: path.join(__dirname, "loader.js") }
					]
				}
			: {},
	target: "node",
	devtool: false,
	optimization: {
		sideEffects: cacheType === "optimized",
		concatenateModules: false
	},
	cache:
		cacheType === "disabled"
			? false
			: { type: cacheType === "filesystem" ? "filesystem" : "memory" },
	experiments: { incremental: cacheType !== false },
	output: { filename: `${index}.js`, clean: false },
	plugins: [
		(compiler) => {
			/** @type {ModuleGraph | undefined} */
			let previousGraph;
			/** @type {ModuleGraphConnection | undefined} */
			let previousConnection;
			let factorizations = 0;
			compiler.hooks.compilation.tap(
				"IncrementalGraph",
				(compilation, { normalModuleFactory }) => {
					factorizations = 0;
					compilation.fileDependencies.add(
						path.join(compiler.context, "version.txt")
					);
					normalModuleFactory.hooks.factorize.tap("IncrementalGraph", () => {
						factorizations++;
					});
				}
			);
			compiler.hooks.finishMake.tap("IncrementalGraph", (compilation) => {
				if (!compiler.watchMode) return;
				const graph = compilation.moduleGraph;
				const stable = [...compilation.modules].find(
					(module) =>
						module.nameForCondition() ===
						path.join(compiler.context, "stable.js")
				);
				if (!stable) throw new Error("The stable module must remain reachable");
				const connection = [...graph.getOutgoingConnections(stable)][0];
				if (previousGraph !== undefined) {
					const reusesGraph =
						compiler.options.experiments.incremental === true &&
						(cacheType === false ||
							(typeof cacheType === "string" &&
								["memory", "filesystem", "disabled"].includes(cacheType))) &&
						currentWatchStep.step !== "4";
					expect(graph === previousGraph).toBe(reusesGraph);
					expect(connection === previousConnection).toBe(reusesGraph);
					if (currentWatchStep.step === "1") {
						expect(factorizations).toBe(reusesGraph ? 0 : 4);
					}
				}
				previousGraph = graph;
				previousConnection = connection;
				if (currentWatchStep.step === "3") {
					const added = [...compilation.modules].find(
						(module) =>
							module.nameForCondition() ===
							path.join(compiler.context, "added.js")
					);
					if (!added) {
						throw new Error(
							"The directly imported module must remain reachable"
						);
					}
					const issuer = graph.getIssuer(added);
					expect(issuer && issuer.nameForCondition()).toBe(
						path.join(compiler.context, "value.js")
					);
					expect(
						[...compilation.modules].some(
							(module) =>
								module.nameForCondition() ===
								path.join(compiler.context, "bridge.js")
						)
					).toBe(false);
				}
			});
		}
	]
}));
