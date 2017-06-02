/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class MergeDuplicateChunksPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunks-basic", (chunks) => {
				const map = Object.create(null);
				chunks.slice().forEach((chunk) => {
					if(chunk.hasRuntime() || chunk.hasEntryModule()) return;
					const ident = chunk.getModulesIdent();
					const otherChunk = map[ident];
					if(otherChunk) {
						if(otherChunk.integrate(chunk, "duplicate"))
							chunks.splice(chunks.indexOf(chunk), 1);
						return;
					}
					map[ident] = chunk;
				});
			});
		});
	}
}
module.exports = MergeDuplicateChunksPlugin;
