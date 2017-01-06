/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

function getChunkIdentifier(chunk) {
	return chunk.modules.map((m) => {
		return m.identifier();
	}).sort().join(", ");
}

class MergeDuplicateChunksPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunks-basic", (chunks) => {
				const map = {};
				chunks.slice().forEach((chunk) => {
					if(chunk.hasRuntime() || chunk.hasEntryModule()) return;
					const ident = getChunkIdentifier(chunk);
					if(map[ident]) {
						if(map[ident].integrate(chunk, "duplicate"))
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
