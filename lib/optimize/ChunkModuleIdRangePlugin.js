"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
class ChunkModuleIdRangePlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", function(compilation) {
			compilation.plugin("module-ids", function(modules) {
				const chunk = this.chunks.filter(chunk => chunk.name === options.name)[0];
				if(!chunk) {
					throw new Error(`ChunkModuleIdRangePlugin: Chunk with name '${options.name}' was not found`);
				}
				let currentId = options.start;
				let chunkModules;
				if(options.order) {
					chunkModules = chunk.modules.slice();
					switch(options.order) {
						case "index":
							chunkModules.sort((a, b) => a.index - b.index);
							break;
						case "index2":
							chunkModules.sort((a, b) => a.index2 - b.index2);
							break;
						default:
							throw new Error("ChunkModuleIdRangePlugin: unexpected value of order");
					}
				} else {
					chunkModules = modules.filter(m => m.chunks.indexOf(chunk) >= 0);
				}
				console.log(chunkModules);
				for(let i = 0; i < chunkModules.length; i++) {
					const m = chunkModules[i];
					if(m.id === null) {
						m.id = currentId++;
					}
					if(options.end && currentId > options.end) {
						break;
					}
				}
			});
		});
	}
}
module.exports = ChunkModuleIdRangePlugin;
