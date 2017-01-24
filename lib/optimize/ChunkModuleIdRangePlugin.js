/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
class ChunkModuleIdRangePlugin {
	constructor(options) {
		this.options = options;
	}
	apply(compiler) {
		let options = this.options;
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("module-ids", (modules) => {
				let chunk = this.chunks.filter((chunk) => {
					return chunk.name === options.name;
				})[0];
				if(!chunk) throw new Error("ChunkModuleIdRangePlugin: Chunk with name '" + options.name + "' was not found");
				let currentId = options.start;
				let chunkModules;
				if(options.order) {
					chunkModules = chunk.modules.slice();
					switch(options.order) {
						case "index":
							chunkModules.sort((a, b) => {
								return a.index - b.index;
							});
							break;
						case "index2":
							chunkModules.sort((a, b) => {
								return a.index2 - b.index2;
							});
							break;
						default:
							throw new Error("ChunkModuleIdRangePlugin: unexpected value of order");
					}

				} else {
					chunkModules = modules.filter((m) => {
						return m.chunks.indexOf(chunk) >= 0;
					});
				}
				console.log(chunkModules);
				for(let i = 0; i < chunkModules.length; i++) {
					let m = chunkModules[i];
					if(m.id === null) {
						m.id = currentId++;
					}
					if(options.end && currentId > options.end)
						break;
				}
			});
		});
	}
}
module.exports = ChunkModuleIdRangePlugin;
