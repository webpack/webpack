/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { ConcatSource, PrefixSource } = require("webpack-sources");
const EnvironmentRuntimeModule = require("../runtime/EnvironmentRuntimeModule");

/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkTemplate")} ChunkTemplate */
/** @typedef {import("../Compilation")} Compilation */

class UniversalChunkTemplatePlugin {
	/**
	 * @param {Compilation} compilation the compilation
	 */
	constructor(compilation) {
		this.compilation = compilation;
	}

	/**
	 * @param {ChunkTemplate} chunkTemplate the chunk template
	 * @returns {void}
	 */
	apply(chunkTemplate) {
		const runtimeEnvironment = new EnvironmentRuntimeModule(
			this.compilation,
			"__universal_env__"
		).generate();
		chunkTemplate.hooks.render.tap(
			"UniversalChunkTemplatePlugin",
			(modules, moduleTemplate, renderContext) => {
				const source = new ConcatSource();
				source.add("var __universal_env__;\n");
				source.add(runtimeEnvironment);
				source.add("\n");

				// Hoisting modules to top level, this is for
				// multiple chunk template renderer in universal occassion
				source.add("/** Hoisted Modules **/\n");
				source.add("var __universal_modules__ =");
				source.add(new PrefixSource("\t", modules));
				source.add(";\n");
				return source;
			}
		);
	}
}

module.exports = UniversalChunkTemplatePlugin;
