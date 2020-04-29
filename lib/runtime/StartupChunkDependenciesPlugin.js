/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compiler")} Compiler */

class StartupChunkDependenciesPlugin {
	constructor(options) {
		this.asyncChunkLoading =
			options && typeof options.asyncChunkLoading === "boolean"
				? options.asyncChunkLoading
				: true;
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"StartupChunkDependenciesPlugin",
			compilation => {
				compilation.hooks.additionalTreeRuntimeRequirements.tap(
					"StartupChunkDependenciesPlugin",
					(chunk, set) => {
						if (compilation.chunkGraph.hasChunkEntryDependentChunks(chunk)) {
							set.add(RuntimeGlobals.startup);
							set.add(RuntimeGlobals.ensureChunk);
							set.add(RuntimeGlobals.ensureChunkIncludeEntries);
							compilation.addRuntimeModule(
								chunk,
								new StartupChunkDependenciesRuntimeModule(
									this.asyncChunkLoading
								)
							);
						}
					}
				);
			}
		);
	}
}

class StartupChunkDependenciesRuntimeModule extends RuntimeModule {
	constructor(asyncChunkLoading) {
		super("startup chunk dependencies");
		this.asyncChunkLoading = asyncChunkLoading;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunk, compilation } = this;
		const { chunkGraph, runtimeTemplate } = compilation;
		const chunkIds = Array.from(
			chunkGraph.getChunkEntryDependentChunksIterable(chunk)
		).map(chunk => {
			return chunk.id;
		});
		return Template.asString([
			`var next = ${RuntimeGlobals.startup};`,
			`${RuntimeGlobals.startup} = ${runtimeTemplate.basicFunction(
				"",
				!this.asyncChunkLoading
					? chunkIds
							.map(
								id => `${RuntimeGlobals.ensureChunk}(${JSON.stringify(id)});`
							)
							.concat("return next();")
					: chunkIds.length === 1
					? `return ${RuntimeGlobals.ensureChunk}(${JSON.stringify(
							chunkIds[0]
					  )}).then(next);`
					: chunkIds.length > 2
					? [
							// using map is shorter for 3 or more chunks
							`return Promise.all(${JSON.stringify(chunkIds)}.map(${
								RuntimeGlobals.ensureChunk
							}, __webpack_require__)).then(next);`
					  ]
					: [
							// calling ensureChunk directly is shorter for 0 - 2 chunks
							"return Promise.all([",
							Template.indent(
								chunkIds
									.map(
										id => `${RuntimeGlobals.ensureChunk}(${JSON.stringify(id)})`
									)
									.join(",\n")
							),
							"]).then(next);"
					  ]
			)};`
		]);
	}
}

module.exports = StartupChunkDependenciesPlugin;
