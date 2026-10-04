"use strict";

const assert = require("assert");
const { HotModuleReplacementPlugin } = require("../../../..");

/** @type {import("../../../..").Configuration[]} */
const configurations = [];
for (const target of ["node", "async-node", "web", "webworker"]) {
	for (const mode of /** @type {const} */ (["development", "production"])) {
		const name = `${target}-${mode}`;
		configurations.push({
			name,
			target,
			mode,
			devtool: false,
			cache: { type: mode === "development" ? "memory" : "filesystem" },
			output: {
				clean: false,
				filename: `${name}.js`,
				chunkFilename: `${name}.[name].js`,
				hotUpdateChunkFilename: `${name}.[id].[fullhash].hot-update.js`,
				hotUpdateMainFilename: `${name}.[runtime].[fullhash].hot-update.json`,
				uniqueName: name,
				library: { type: "commonjs2" },
				publicPath: "https://test.cases/path/"
			},
			optimization: {
				minimize: false,
				emitOnErrors: false,
				moduleIds: "named",
				chunkIds: "named"
			},
			plugins: [
				new HotModuleReplacementPlugin(),
				(compiler) => {
					/** @type {import("../../../..").ModuleGraph | undefined} */
					let graph;
					compiler.hooks.finishMake.tap("RetainedGraph", (compilation) => {
						if (graph) assert.strictEqual(compilation.moduleGraph, graph);
						graph = compilation.moduleGraph;
					});
				}
			]
		});
	}
}

module.exports = configurations;
