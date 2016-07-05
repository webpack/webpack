/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function AggressiveSplittingPlugin(options) {
	this.options = options;
}
module.exports = AggressiveSplittingPlugin;

function makeRelative(compiler, identifier) {
	var context = compiler.context;
	return identifier.split("|").map(function(str) {
		return str.split("!").map(function(str) {
			return path.relative(context, str);
		}).join("!");
	}).join("|");
}

function copyWithReason(obj) {
	var newObj = {};
	Object.keys(obj).forEach(function(key) {
		newObj[key] = obj[key];
	});
	if(!newObj.reasons || newObj.reasons.indexOf("aggressive-splitted") < 0)
		newObj.reasons = (newObj.reasons || []).concat("aggressive-splitted");
	return newObj;
}

AggressiveSplittingPlugin.prototype.apply = function(compiler) {
	var _this = this;
	compiler.plugin("compilation", function(compilation) {
		compilation.plugin("optimize-chunks-advanced", function(chunks) {
			var i, chunk, newChunk;
			var savedSplits = compilation.records && compilation.records.aggressiveSplits || [];
			var usedSplits = savedSplits;
			if(compilation._aggressiveSplittingSplits)
				usedSplits = usedSplits.concat(compilation._aggressiveSplittingSplits);
			var minSize = _this.options.minSize;
			var maxSize = _this.options.maxSize;
			// 1. try to restore to recorded splitting
			for(var j = 0; j < usedSplits.length; j++) {
				var splitData = usedSplits[j];
				for(i = 0; i < chunks.length; i++) {
					chunk = chunks[i];
					var chunkModuleNames = chunk.modules.map(function(m) {
						return makeRelative(compiler, m.identifier());
					});
					if(chunkModuleNames.length < splitData.modules)
						continue;
					var moduleIndicies = splitData.modules.map(function(m) {
						return chunkModuleNames.indexOf(m);
					});
					var hasAllModules = moduleIndicies.every(function(idx) {
						return idx >= 0;
					});
					if(hasAllModules) {
						if(chunkModuleNames.length > splitData.modules.length) {
							var selectedModules = moduleIndicies.map(function(idx) {
								return chunk.modules[idx];
							});
							newChunk = compilation.addChunk();
							selectedModules.forEach(function(m) {
								chunk.moveModule(m, newChunk);
							});
							chunk.split(newChunk);
							chunk.name = null;
							newChunk._fromAggressiveSplitting = true;
							if(j < savedSplits.length)
								newChunk._fromAggressiveSplittingIndex = j;
							newChunk.id = splitData.id;
							newChunk.origins = chunk.origins.map(copyWithReason);
							chunk.origins = chunk.origins.map(copyWithReason);
							console.log("restored", splitData.modules, chunk.modules.map(function(m) {
								return makeRelative(compiler, m.identifier());
							}));
							return true;
						} else {
							if(j < savedSplits.length)
								chunk._fromAggressiveSplittingIndex = j;
							chunk.name = null;
							chunk.id = splitData.id;
							console.log("assigned", splitData.modules);
						}
					}
				}
			}
			// 2. for any other chunk which isn't splitted yet, split it
			for(i = 0; i < chunks.length; i++) {
				chunk = chunks[i];
				var size = chunk.size(_this.options);
				if(size > maxSize) {
					newChunk = compilation.addChunk();
					var modules = chunk.modules.filter(function(m) {
						return chunk.entryModule !== m;
					}).sort(function(a, b) {
						a = a.identifier();
						b = b.identifier();
						if(a > b) return 1;
						if(a < b) return -1;
						return 0;
					});
					for(var k = 0; k < modules.length; k++) {
						chunk.moveModule(modules[k], newChunk);
						var newSize = newChunk.size(_this.options);
						var chunkSize = chunk.size(_this.options);
						if(chunkSize < maxSize && newSize < maxSize && newSize >= minSize && chunkSize >= minSize)
							break;
						if(newSize > maxSize || chunkSize < minSize) {
							// move it back
							newChunk.moveModule(modules[k], chunk);
						}
					}
					if(newChunk.modules.length > 0) {
						chunk.split(newChunk);
						console.log(newChunk.entrypoints, newChunk.parents);
						chunk.name = null;
						newChunk.origins = chunk.origins.map(copyWithReason);
						chunk.origins = chunk.origins.map(copyWithReason);
						console.log("splitted", newChunk.modules.map(function(m) {
							return makeRelative(compiler, m.identifier());
						}), newChunk.size(_this.options), chunk.modules.map(function(m) {
							return makeRelative(compiler, m.identifier());
						}), chunk.size(_this.options));
						compilation._aggressiveSplittingSplits = (compilation._aggressiveSplittingSplits || []).concat({
							modules: newChunk.modules.map(function(m) {
								return makeRelative(compiler, m.identifier());
							})
						});
						return true;
					} else {
						newChunk.remove();
					}
				}
			}
		});
		compilation.plugin("record-hash", function(records) {
			// 3. save to made splittings to records
			var minSize = _this.options.minSize;
			var maxSize = _this.options.maxSize;
			if(!records.aggressiveSplits) records.aggressiveSplits = [];
			compilation.chunks.forEach(function(chunk) {
				if(chunk.hasEntryModule()) return;
				var size = chunk.size(_this.options);
				var incorrectSize = size < minSize || size > maxSize;
				var modules = chunk.modules.map(function(m) {
					return makeRelative(compiler, m.identifier());
				});
				if(typeof chunk._fromAggressiveSplittingIndex === "undefined") {
					if(incorrectSize) return;
					console.log("saved chunk", modules);
					records.aggressiveSplits.push({
						modules: modules,
						hash: chunk.hash,
						id: chunk.id
					});
				} else {
					var splitData = records.aggressiveSplits[chunk._fromAggressiveSplittingIndex];
					if(splitData.hash !== chunk.hash || incorrectSize) {
						console.log("invalid", splitData, chunk.hash, chunk._fromAggressiveSplitting, incorrectSize);
						if(chunk._fromAggressiveSplitting) {
							chunk._aggressiveSplittingInvalid = true;
							splitData.invalid = true;
						} else {
							splitData.hash = chunk.hash;
						}
					}
				}
			});
			records.aggressiveSplits = records.aggressiveSplits.filter(function(splitData) {
				return !splitData.invalid;
			});
		});
		compilation.plugin("need-additional-seal", function(callback) {
			var invalid = this.chunks.some(function(chunk) {
				return chunk._aggressiveSplittingInvalid;
			});
			console.log("need-additional-seal", invalid);
			if(invalid)
				return true;
		});
	});
};
