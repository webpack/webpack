/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var nextIdent = 0;

function CommonsChunkPlugin(options, filenameTemplate, selectedChunks, minChunks) {
	if(options && typeof options === "object" && !Array.isArray(options)) {
		this.chunkNames = options.name || options.names;
		this.filenameTemplate = options.filename;
		this.minChunks = options.minChunks;
		this.selectedChunks = options.chunks;
		if(options.children) this.selectedChunks = false;
		this.async = options.async;
		this.minSize = options.minSize;
	} else {
		var chunkNames = options;
		if(typeof filenameTemplate !== "string" && filenameTemplate !== null) {
			minChunks = selectedChunks;
			selectedChunks = filenameTemplate;
			filenameTemplate = chunkNames;
		}
		if(!Array.isArray(selectedChunks) && typeof selectedChunks !== "boolean" && selectedChunks !== null) {
			minChunks = selectedChunks;
			selectedChunks = undefined;
		}
		this.chunkNames = chunkNames;
		this.filenameTemplate = filenameTemplate;
		this.minChunks = minChunks;
		this.selectedChunks = selectedChunks;
	}
	this.ident = __filename + (nextIdent++);
}

module.exports = CommonsChunkPlugin;
CommonsChunkPlugin.prototype.apply = function(compiler) {
	var chunkNames = this.chunkNames;
	var filenameTemplate = this.filenameTemplate;
	var minChunks = this.minChunks;
	var selectedChunks = this.selectedChunks;
	var async = this.async;
	var minSize = this.minSize;
	var ident = this.ident;
	compiler.plugin("this-compilation", function(compilation) {
		compilation.plugin(["optimize-chunks", "optimize-extracted-chunks"], function(chunks) {
			// only optimize once
			if(compilation[ident]) return;
			compilation[ident] = true;

			var commonChunks;
			if(!chunkNames && (selectedChunks === false || async)) {
				commonChunks = chunks;
			} else if(Array.isArray(chunkNames) || typeof chunkNames === "string") {
				commonChunks = [].concat(chunkNames).map(function(chunkName) {
					var chunk = chunks.filter(function(chunk) {
						return chunk.name === chunkName;
					})[0];
					if(!chunk) {
						chunk = this.addChunk(chunkName);
						chunk.initial = chunk.entry = true;
					}
					return chunk;
				}, this);
			} else {
				throw new Error("Invalid chunkNames argument");
			}
			commonChunks.forEach(function processCommonChunk(commonChunk, idx) {
				var commonModulesCount = [];
				var commonModules = [];
				var usedChunks;
				if(Array.isArray(selectedChunks)) {
					usedChunks = chunks.filter(function(chunk) {
						if(chunk === commonChunk) return false;
						return selectedChunks.indexOf(chunk.name) >= 0;
					});
				} else if(selectedChunks === false || async) {
					usedChunks = (commonChunk.chunks || []).filter(function(chunk) {
						// we can only move modules from this chunk if the "commonChunk" is the only parent
						return async || chunk.parents.length === 1;
					});
				} else {
					if(!commonChunk.entry) {
						compilation.errors.push(new Error("CommonsChunkPlugin: While running in normal mode it's not allowed to use a non-entry chunk (" + commonChunk.name + ")"));
						return;
					}
					usedChunks = chunks.filter(function(chunk) {
						var found = commonChunks.indexOf(chunk);
						if(found >= idx) return false;
						return chunk.entry;
					});
				}
				if(async) {
					var asyncChunk = this.addChunk(typeof async === "string" ? async : undefined);
					asyncChunk.chunkReason = "async commons chunk";
					asyncChunk.extraAsync = true;
					asyncChunk.addParent(commonChunk);
					commonChunk.addChunk(asyncChunk);
					commonChunk = asyncChunk;
				}
				usedChunks.forEach(function(chunk) {
					chunk.modules.forEach(function(module) {
						var idx = commonModules.indexOf(module);
						if(idx < 0) {
							commonModules.push(module);
							commonModulesCount.push(1);
						} else {
							commonModulesCount[idx]++;
						}
					});
				});
				var reallyUsedChunks = [];
				var reallyUsedModules = [];
				commonModulesCount.forEach(function(count, idx) {
					var module = commonModules[idx];
					if(typeof minChunks === "function") {
						if(!minChunks(module, count))
							return;
					} else if(count < (minChunks || Math.max(2, usedChunks.length))) {
						return;
					}
					reallyUsedModules.push(module);
				});
				if(minSize) {
					var size = reallyUsedModules.reduce(function(a, b) {
						return a + b.size();
					}, 0);
					if(size < minSize)
						return;
				}
				reallyUsedModules.forEach(function(module) {
					usedChunks.forEach(function(chunk) {
						if(module.removeChunk(chunk)) {
							if(reallyUsedChunks.indexOf(chunk) < 0)
								reallyUsedChunks.push(chunk);
						}
					});
					commonChunk.addModule(module);
					module.addChunk(commonChunk);
				});
				if(async) {
					reallyUsedChunks.forEach(function(chunk) {
						if(chunk.initial || chunk.entry)
							return;
						chunk.blocks.forEach(function(block) {
							block.chunks.unshift(commonChunk);
							commonChunk.addBlock(block);
						});
					});
					asyncChunk.origins = reallyUsedChunks.map(function(chunk) {
						return chunk.origins.map(function(origin) {
							var newOrigin = Object.create(origin);
							newOrigin.reasons = (origin.reasons || []).slice();
							newOrigin.reasons.push("async commons");
							return newOrigin;
						});
					}).reduce(function(arr, a) {
						arr.push.apply(arr, a);
						return arr;
					}, []);
				} else {
					usedChunks.forEach(function(chunk) {
						chunk.parents = [commonChunk];
						commonChunk.chunks.push(chunk);
						if(chunk.initial)
							commonChunk.initial = true;
						if(chunk.entry) {
							commonChunk.entry = true;
							chunk.entry = false;
						}
					});
				}
				if(filenameTemplate)
					commonChunk.filenameTemplate = filenameTemplate;
			}, this);
			this.restartApplyPlugins();
		});
	});
};
