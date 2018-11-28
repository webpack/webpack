/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");

/** @typedef {import("../ChunkTemplate")} ChunkTemplate */

const getRuntimeModuleIds = (chunkGraph, chunk) => {
	return chunkGraph
		.getChunkRuntimeModulesInOrder(chunk)
		.map(m => chunkGraph.getModuleId(m));
};

class NodeChunkTemplatePlugin {
	constructor(compilation) {
		this.compilation = compilation;
	}
	/**
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @returns {void}
	 */
	apply(chunkTemplate) {
		chunkTemplate.hooks.render.tap(
			"NodeChunkTemplatePlugin",
			(modules, moduleTemplate, { chunk, chunkGraph }) => {
				const source = new ConcatSource();
				source.add(`exports.id = ${JSON.stringify(chunk.id)};\n`);
				source.add(`exports.ids = ${JSON.stringify(chunk.ids)};\n`);
				source.add(`exports.modules = `);
				source.add(modules);
				source.add(";\n");
				const runtimeModules = getRuntimeModuleIds(chunkGraph, chunk);
				if (runtimeModules.length > 0) {
					source.add(`exports.runtime = ${JSON.stringify(runtimeModules)};\n`);
				}
				return source;
			}
		);
		chunkTemplate.hooks.hashForChunk.tap(
			"NodeChunkTemplatePlugin",
			(hash, chunk) => {
				const chunkGraph = this.compilation.chunkGraph;
				hash.update(JSON.stringify(getRuntimeModuleIds(chunkGraph, chunk)));
			}
		);
		chunkTemplate.hooks.hash.tap("NodeChunkTemplatePlugin", hash => {
			hash.update("node");
			hash.update("5");
		});
	}
}

module.exports = NodeChunkTemplatePlugin;
