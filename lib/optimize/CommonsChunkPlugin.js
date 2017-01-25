/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var nextIdent = 0;

function CommonsChunkPlugin(options) {
	if(arguments.length > 1) {
		throw new Error("Deprecation notice: CommonsChunkPlugin now only takes a single argument. Either an options " +
			"object *or* the name of the chunk.\n" +
			"Example: if your old code looked like this:\n" +
			"    new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.bundle.js')\n\n" +
			"You would change it to:\n" +
			"    new webpack.optimize.CommonsChunkPlugin({ name: 'vendor', filename: 'vendor.bundle.js' })\n\n" +
			"The available options are:\n" +
			"    name: string\n" +
			"    names: string[]\n" +
			"    filename: string\n" +
			"    minChunks: number\n" +
			"    chunks: string[]\n" +
			"    children: boolean\n" +
			"    async: boolean\n" +
			"    minSize: number\n");
	}
	if(Array.isArray(options) || typeof options === "string") {
		options = {
			name: options
		};
	}
	this.chunkNames = options.name || options.names;
	this.filenameTemplate = options.filename;
	this.minChunks = options.minChunks;
	this.selectedChunks = options.chunks;
	if(options.children) this.selectedChunks = false;
	this.async = options.async;
	this.minSize = options.minSize;
	this.ident = __filename + (nextIdent++);
}

module.exports = CommonsChunkPlugin;
CommonsChunkPlugin.prototype.apply = function(compiler) {
	var chunkNames = this.chunkNames;
	var filenameTemplate = this.filenameTemplate;
	var minChunks = this.minChunks;
	var selectedChunks = this.selectedChunks;
	var asyncOption = this.async;
	var minSize = this.minSize;
	var ident = this.ident;
	compiler.plugin("this-compilation", function(compilation) {
		compilation.plugin(["optimize-chunks", "optimize-extracted-chunks"], function(chunks) {
			// only optimize once
			if(compilation[ident]) return;
			compilation[ident] = true;

			var commonChunks;
			if(!chunkNames && (selectedChunks === false || asyncOption)) {
				commonChunks = chunks;
			} else if(Array.isArray(chunkNames) || typeof chunkNames === "string") {
				commonChunks = [].concat(chunkNames).map(function(chunkName) {
					var chunk = chunks.filter(function(chunk) {
						return chunk.name === chunkName;
					})[0];
					if(!chunk) {
						chunk = this.addChunk(chunkName);
					}
					return chunk;
				}, this);
			} else {
				throw new Error("Invalid chunkNames argument");
			}
			commonChunks.forEach(function processCommonChunk(commonChunk, idx) {
				var usedChunks;
				if(Array.isArray(selectedChunks)) {
					usedChunks = chunks.filter(function(chunk) {
						if(chunk === commonChunk) return false;
						return selectedChunks.indexOf(chunk.name) >= 0;
					});
				} else if(selectedChunks === false || asyncOption) {
					usedChunks = (commonChunk.chunks || []).filter(function(chunk) {
						// we can only move modules from this chunk if the "commonChunk" is the only parent
						return asyncOption || chunk.parents.length === 1;
					});
				} else {
					if(commonChunk.parents.length > 0) {
						compilation.errors.push(new Error("CommonsChunkPlugin: While running in normal mode it's not allowed to use a non-entry chunk (" + commonChunk.name + ")"));
						return;
					}
					usedChunks = chunks.filter(function(chunk) {
						var found = commonChunks.indexOf(chunk);
						if(found >= idx) return false;
						return chunk.hasRuntime();
					});
				}
				if(asyncOption) {
					var asyncChunk = this.addChunk(typeof asyncOption === "string" ? asyncOption : undefined);
					asyncChunk.chunkReason = "async commons chunk";
					asyncChunk.extraAsync = true;
					asyncChunk.addParent(commonChunk);
					commonChunk.addChunk(asyncChunk);
					commonChunk = asyncChunk;
				}
				var reallyUsedModules = [];
				if(minChunks !== Infinity) {
					var commonModulesCount = [];
					var commonModules = [];
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
					var _minChunks = (minChunks || Math.max(2, usedChunks.length));
					commonModulesCount.forEach(function(count, idx) {
						var module = commonModules[idx];
						if(typeof minChunks === "function") {
							if(!minChunks(module, count))
								return;
						} else if(count < _minChunks) {
							return;
						}
						if(module.chunkCondition && !module.chunkCondition(commonChunk))
							return;
						reallyUsedModules.push(module);
					});
				}
				if(minSize) {
					var size = reallyUsedModules.reduce(function(a, b) {
						return a + b.size();
					}, 0);
					if(size < minSize)
						return;
				}
				var reallyUsedChunks = [];
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
				if(asyncOption) {
					reallyUsedChunks.forEach(function(chunk) {
						if(chunk.isInitial())
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
						chunk.entrypoints.forEach(function(ep) {
							ep.insertChunk(commonChunk, chunk);
						});
						commonChunk.addChunk(chunk);
					});
				}
				if(filenameTemplate)
					commonChunk.filenameTemplate = filenameTemplate;
			}, this);
			return true;
		});
	});
};
