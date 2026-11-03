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
