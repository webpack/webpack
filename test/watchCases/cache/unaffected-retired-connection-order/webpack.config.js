"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = ["memory", "filesystem"].map((type) => ({
	mode: "development",
	devtool: false,
	entry: { main: "./index.js", trigger: ["./keep.js", "./tick.js"] },
	cache: type === "memory" ? { type: "memory" } : { type: "filesystem" },
	experiments: { cacheUnaffected: true },
	output: { filename: `${type}-[name].js`, clean: false },
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap(
				"RetiredConnectionOrder",
				(compilation) => {
					compilation.hooks.optimizeDependencies.tap(
						"RetiredConnectionOrder",
						(modules) => {
							const byPath = new Map(
								[...modules].map((module) => [
									module.nameForCondition(),
									module
								])
							);
							const origin = byPath.get(
								path.join(compiler.context, "index.js")
							);
							const temporary = byPath.get(
								path.join(compiler.context, "keep.js")
							);
							const a = byPath.get(path.join(compiler.context, "a.js"));
							const b = byPath.get(path.join(compiler.context, "b.js"));
							const x = byPath.get(path.join(compiler.context, "x.js"));
							const y = byPath.get(path.join(compiler.context, "y.js"));
							assert(origin && temporary && a && b && x && y);
							const { moduleGraph } = compilation;
							const dependencyA = origin.dependencies.find(
								(dependency) => moduleGraph.getModule(dependency) === a
							);
							const dependencyB = origin.dependencies.find(
								(dependency) => moduleGraph.getModule(dependency) === b
							);
							assert(dependencyA && dependencyB);
							const first = currentWatchStep.step === "0";
							for (const target of first ? [x, y, a] : [x, a]) {
								moduleGraph.updateModule(dependencyA, target);
							}
							for (const target of first ? [x, b] : [x, y, b]) {
								moduleGraph.updateModule(dependencyB, target);
							}
							const currentA = moduleGraph.getConnection(dependencyA);
							const currentB = moduleGraph.getConnection(dependencyB);
							assert(currentA && currentB);
							currentA.setActive(first);
							currentB.setActive(!first);
							const outgoing = [...moduleGraph.getOutgoingConnections(origin)];
							const oldA = outgoing.filter(
								(connection) =>
									connection.dependency === dependencyA &&
									connection !== currentA
							);
							const oldB = outgoing.filter(
								(connection) =>
									connection.dependency === dependencyB &&
									connection !== currentB
							);
							// Without distinguishing retired connections, both orders have the same states and dependency ids.
							const ordered = first
								? [...oldA, ...oldB, currentB, currentA]
								: [...oldA, currentA, ...oldB, currentB];
							const selected = new Set(ordered);
							moduleGraph.moveModuleConnections(
								origin,
								temporary,
								(connection) => selected.has(connection)
							);
							for (const connection of ordered) {
								moduleGraph.moveModuleConnections(
									temporary,
									origin,
									(candidate) => candidate === connection
								);
							}
						}
					);
				}
			);
		}
	]
}));
