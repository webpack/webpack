/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

module.exports = class AutomaticCommonsChunksPlugin {
	constructor(options) {
		this.options = Object.assign({}, {
			initialChunks: false,
			onlyNamed: false,
			name: undefined
		}, options);
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("AutomaticCommonsChunksPlugin", compilation => {
			compilation.hooks.optimizeChunks.tap("AutomaticCommonsChunksPlugin", chunks => {
				const indexMap = new Map();
				let index = 1;
				for(const chunk of chunks) {
					if(chunk.isInitial() === this.options.initialChunks)
						indexMap.set(chunk, index++);
				}
				const chunksModulesMap = new Map();
				const chunksNameMap = new Map();
				for(const module of compilation.modules) {
					const chunkIndices = Array.from(module.chunksIterable, chunk => indexMap.get(chunk)).filter(Boolean);
					let name = this.options.name;
					if(typeof name === "function")
						name = name(module);
					if(name) {
						chunkIndices.push(name);
					} else if(this.options.onlyNamed) {
						continue;
					}
					if(chunkIndices.length <= 1) continue;
					const key = chunkIndices.sort().join();
					let modules = chunksModulesMap.get(key);
					if(modules === undefined) {
						chunksModulesMap.set(key, modules = []);
						if(name) {
							chunksNameMap.set(key, name);
						}
					}
					modules.push(module);
				}
				for(const [key, modules] of chunksModulesMap.entries()) {
					let chunkName = chunksNameMap.get(key);
					const newChunk = compilation.addChunk(chunkName);
					for(const chunk of modules[0].chunksIterable) {
						chunk.split(newChunk);
						for(const module of modules) {
							chunk.removeModule(module);
							module.rewriteChunkInReasons(chunk, [newChunk]);
						}
					}
					for(const module of modules) {
						newChunk.addModule(module);
						module.addChunk(newChunk);
					}
				}
			});
		});
	}
};
