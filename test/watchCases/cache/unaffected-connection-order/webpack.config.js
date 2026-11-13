"use strict";

const assert = require("assert");
const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = Array.from({ length: 4 }, (_, index) => ({
	mode: "development",
	devtool: false,
	entry: {
		main: "./index.js",
		second: "./index.js",
		keep: "./keep.js",
		trigger: "./tick.js"
	},
	cache: { type: index % 2 === 0 ? "memory" : "filesystem" },
	experiments: { cacheUnaffected: true },
	output: { filename: `${index}-[name].js`, clean: false },
	plugins: [
		(compiler) => {
			const inactiveState =
				index < 2
					? false
					: compiler.webpack.ModuleGraphConnection.TRANSITIVE_ONLY;
			compiler.hooks.compilation.tap("ConnectionOrder", (compilation) => {
				const { moduleGraph } = compilation;
				compilation.hooks.optimizeDependencies.tap(
					"ConnectionOrder",
					(modules) => {
						const byPath = new Map(
							[...modules].map((module) => [module.nameForCondition(), module])
						);
						const origin = byPath.get(path.join(compiler.context, "index.js"));
						const temporary = byPath.get(
							path.join(compiler.context, "keep.js")
						);
						assert(origin && temporary);
						const connections = [...moduleGraph.getOutgoingConnections(origin)];
						const selected = new Set(connections);
						moduleGraph.moveModuleConnections(origin, temporary, (connection) =>
							selected.has(connection)
						);
						const step = Number(currentWatchStep.step);
						const reversed =
							step === 1 || step === 2 || step === 5 || step === 8;
						connections.sort((a, b) => {
							const first = a.module.identifier();
							const second = b.module.identifier();
							return (first < second ? -1 : 1) * (reversed ? -1 : 1);
						});
						const active = [
							["a.js"],
							["b.js"],
							["b.js"],
							["a.js"],
							["a.js", "b.js"],
							["a.js", "b.js"],
							[],
							[],
							["b.js"]
						][step];
						for (const connection of connections) {
							moduleGraph.moveModuleConnections(
								temporary,
								origin,
								(candidate) => candidate === connection
							);
							const resource = connection.module.nameForCondition();
							assert(resource);
							const name = path.basename(resource);
							connection.setActive(true);
							connection.addCondition(
								() => active.includes(name) || inactiveState
							);
						}
					}
				);
			});
		}
	]
}));
