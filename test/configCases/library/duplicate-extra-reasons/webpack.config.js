"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	entry: { first: "./index.js", second: "./index.js" },
	output: {
		filename: "[name].js",
		library: { type: "commonjs2" }
	},
	plugins: [
		(compiler) => {
			compiler.hooks.afterCompile.tap("testcase", (compilation) => {
				const { moduleGraph } = compilation;
				const first = compilation.entries.get("first");
				const second = compilation.entries.get("second");
				assert(first && second);
				const module = moduleGraph.getModule(first.dependencies[0]);
				assert(module);
				expect(moduleGraph.getModule(second.dependencies[0])).toBe(module);
				const connections = [...moduleGraph.getIncomingConnections(module)];
				expect(
					connections.filter(
						(connection) =>
							connection.originModule === null && connection.dependency !== null
					)
				).toHaveLength(2);
				expect(
					connections.filter((connection) => connection.dependency === null)
				).toHaveLength(1);
				expect(
					connections
						.filter((connection) => connection.dependency === null)
						.map((connection) => connection.explanation)
				).toEqual(["used as library export"]);
				moduleGraph.addExtraReason(module, "another reason");
				moduleGraph.addExtraReason(module, "another reason");
				expect(
					[...moduleGraph.getIncomingConnections(module)]
						.filter((connection) => connection.dependency === null)
						.map((connection) => connection.explanation)
				).toEqual(["used as library export", "another reason"]);
				const incoming = moduleGraph.getIncomingConnections(module);
				const iterate = incoming[Symbol.iterator];
				let visits = 0;
				/** @returns {Generator<import("../../../../types").ModuleGraphConnection>} counted connections */
				function* countConnections() {
					const iterator = iterate.call(incoming);
					for (let item = iterator.next(); !item.done; item = iterator.next()) {
						visits++;
						yield item.value;
					}
				}
				incoming[Symbol.iterator] = countConnections;
				try {
					for (let i = 0; i < 64; i++) {
						moduleGraph.addExtraReason(module, "another reason");
					}
				} finally {
					incoming[Symbol.iterator] = iterate;
				}
				expect(visits).toBeLessThanOrEqual([...incoming].length * 2);
				const reason = [...incoming].find(
					(connection) => connection.explanation === "another reason"
				);
				assert(reason);
				reason.addExplanation("changed");
				moduleGraph.addExtraReason(module, "another reason changed");
				expect(
					[...incoming].filter(
						(connection) => connection.explanation === "another reason changed"
					)
				).toHaveLength(1);
				moduleGraph.addExtraReason(module, "another reason");
				expect(
					[...incoming].filter(
						(connection) => connection.explanation === "another reason"
					)
				).toHaveLength(1);
				moduleGraph.addExplanation(first.dependencies[0], "entry explanation");
				moduleGraph.addExtraReason(module, "entry explanation");
				expect(
					[...incoming].filter(
						(connection) => connection.explanation === "entry explanation"
					)
				).toHaveLength(2);

				const targetConnection = [
					...moduleGraph.getOutgoingConnections(module)
				].find(
					(connection) => connection.module && connection.module !== module
				);
				assert(targetConnection && targetConnection.module);
				const target = targetConnection.module;
				moduleGraph.addExtraReason(target, "target reason");
				moduleGraph.addExtraReason(target, "target reason");
				moduleGraph.addExtraReason(module, "another reason changed");
				moduleGraph.moveModuleConnections(
					module,
					target,
					(connection) => connection === reason
				);
				moduleGraph.addExtraReason(module, "another reason changed");
				moduleGraph.addExtraReason(target, "another reason changed");
				for (const current of [module, target]) {
					expect(
						[...moduleGraph.getIncomingConnections(current)].filter(
							(connection) =>
								connection.explanation === "another reason changed"
						)
					).toHaveLength(1);
				}
			});
			compiler.hooks.thisCompilation.tap("testcase", (compilation) => {
				compilation.hooks.processAssets.tap("testcase", () => {
					compilation.emitAsset(
						"test.js",
						new compiler.webpack.sources.RawSource(
							fs.readFileSync(path.join(__dirname, "test.js"))
						)
					);
				});
			});
		}
	]
};
