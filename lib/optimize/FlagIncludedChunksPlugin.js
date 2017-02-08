/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const chunkBEntryA = (chunkA, chunkB) => {
	for(var i = 0; i < chunkB.length; i++) {
		if(chunkA.indexOf(chunkB[i]) < 0) return true;
	}

	return false;
};

class FlagIncludedChunksPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunk-ids", (chunks) => {
				for(var a = 0; a < chunks.length; a++) {
					var chunkA = chunks[a];

					for(var b = 0; b < chunks.length; b++) {
						var chunkB = chunks[b];

						if(chunkA === chunkB) continue;
						// is chunkB in chunkA?
						if(chunkA.modules.length < chunkB.modules.length) continue;
						if(chunkBEntryA(chunkA.modules, chunkB.modules)) continue;
						chunkA.ids.push(chunkB.id);
					}
				}
			});
		});
	}
}
module.exports = FlagIncludedChunksPlugin;
