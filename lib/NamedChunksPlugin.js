/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

/** @typedef {import("./Compiler")} Compiler */

class NamedChunksPlugin {
	static defaultNameResolver(chunk) {
		return chunk.name || null;
	}

	constructor(nameResolver) {
		this.nameResolver = nameResolver || NamedChunksPlugin.defaultNameResolver;
	}

	/**
	 * @param {Compiler} compiler Webpack Compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("NamedChunksPlugin", compilation => {
			compilation.hooks.beforeChunkIds.tap("NamedChunksPlugin", chunks => {
				for (const chunk of chunks) {
					if (chunk.id === null) {
						chunk.id = this.nameResolver(chunk);
					}
				}
			});
		});
	}
}

module.exports = NamedChunksPlugin;
