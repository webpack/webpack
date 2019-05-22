/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource, PrefixSource, RawSource } = require("webpack-sources");
const Template = require("../Template");

/** @typedef {import("../ChunkTemplate")} ChunkTemplate */

class NodeChunkTemplatePlugin {
	constructor(compilation) {
		this.compilation = compilation;
	}
	/**
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @returns {void}
	 */
	apply(chunkTemplate) {
		const { target } = this.compilation.options;
		chunkTemplate.hooks.render.tap(
			"NodeChunkTemplatePlugin",
			(modules, moduleTemplate, renderContext) => {
				const previousSource = modules;
				if (target === "universal") {
					modules = new RawSource("__universal_modules__");
				}
				const { chunk, chunkGraph } = renderContext;
				const source = new ConcatSource();
				source.add(`exports.id = ${JSON.stringify(chunk.id)};\n`);
				source.add(`exports.ids = ${JSON.stringify(chunk.ids)};\n`);
				source.add(`exports.modules = `);
				source.add(modules);
				source.add(";\n");
				const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(chunk);
				if (runtimeModules.length > 0) {
					source.add("exports.runtime =\n");
					source.add(
						Template.renderChunkRuntimeModules(runtimeModules, renderContext)
					);
					source.add(";\n");
				}
				if (target === "universal") {
					return new ConcatSource(
						previousSource,
						"\n",
						`if(__universal_env__ === "node") {\n`,
						new PrefixSource("\t", source),
						"\n}\n"
					);
				}
				return source;
			}
		);
		chunkTemplate.hooks.hash.tap("NodeChunkTemplatePlugin", hash => {
			hash.update("node");
			hash.update("5");
		});
	}
}

module.exports = NodeChunkTemplatePlugin;
