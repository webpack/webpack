/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class NamedChunksPlugin {

	static defaultNameResolver(chunk) {
		return chunk.name || null;
	}

	constructor(nameResolver) {
		this.nameResolver = nameResolver || NamedChunksPlugin.defaultNameResolver;
	}

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("before-chunk-ids", (chunks) => {
				chunks.forEach((chunk) => {
					if(chunk.id === null) {
						chunk.id = this.nameResolver(chunk);
					}
				});
			});
		});
	}
}

module.exports = NamedChunksPlugin;
