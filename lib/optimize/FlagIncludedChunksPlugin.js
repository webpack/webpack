/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

class FlagIncludedChunksPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunk-ids", (chunks) => {
				chunks.forEach((chunkA) => {
					chunks.forEach((chunkB) => {
						// as we iterate the same iterables twice
						// skip if we find ourselves
						if(chunkA === chunkB) return;

						// instead of swapping A and B just bail
						// as we loop twice the current A will be B and B then A
						if(chunkA.modules.length < chunkB.modules.length) return;

						if(chunkB.modules.length === 0) return;

						// is chunkB in chunkA?
						for(let i = 0; i < chunkB.modules.length; i++) {
							if(chunkA.modules.indexOf(chunkB.modules[i]) < 0) return;
						}
						chunkA.ids.push(chunkB.id);
					});
				});
			});
		});
	}
}
module.exports = FlagIncludedChunksPlugin;
