/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

let path = require("path");

function makeRelative(context) {
	return function(module) {
		let identifier = module.identifier();
		return identifier.split("|").map((str) => {
			return str.split("!").map((str) => {
				return path.relative(context, str);
			}).join("!");
		}).join("|");
	};
}

function toIndexOf(list) {
	return function(item) {
		return list.indexOf(item);
	};
}

function toChunkModuleIndices(modules) {
	return function(idx) {
		return modules[idx];
	};
}

function moveModuleBetween(oldChunk, newChunk) {
	return function(module) {
		oldChunk.moveModule(module, newChunk);
	};
}

function isNotAEntryModule(entryModule) {
	return function(module) {
		return entryModule !== module;
	};
}

function copyWithReason(obj) {
	let newObj = {};
	Object.keys(obj).forEach((key) => {
		newObj[key] = obj[key];
	});
	if(!newObj.reasons || newObj.reasons.indexOf("aggressive-splitted") < 0)
		newObj.reasons = (newObj.reasons || []).concat("aggressive-splitted");
	return newObj;
}

class AggressiveSplittingPlugin {
	constructor(options) {
		this.options = options || {};
		if(typeof this.options.minSize !== "number") this.options.minSize = 30 * 1024;
		if(typeof this.options.maxSize !== "number") this.options.maxSize = 50 * 1024;
		if(typeof this.options.chunkOverhead !== "number") this.options.chunkOverhead = 0;
		if(typeof this.options.entryChunkMultiplicator !== "number") this.options.entryChunkMultiplicator = 1;
	}
	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin("optimize-chunks-advanced", (chunks) => {
				let i, chunk, newChunk;
				const savedSplits = compilation.records && compilation.records.aggressiveSplits || [];
				let usedSplits = savedSplits;
				if(compilation._aggressiveSplittingSplits)
					usedSplits = usedSplits.concat(compilation._aggressiveSplittingSplits);
				const minSize = this.options.minSize;
				const maxSize = this.options.maxSize;
				// 1. try to restore to recorded splitting
				for(let j = 0; j < usedSplits.length; j++) {
					const splitData = usedSplits[j];
					for(i = 0; i < chunks.length; i++) {
						chunk = chunks[i];
						const chunkModuleNames = chunk.modules.map(makeRelative(compiler.context));

						if(chunkModuleNames.length < splitData.modules)
							continue;
						const moduleIndicies = splitData.modules.map(toIndexOf(chunkModuleNames));
						const hasAllModules = moduleIndicies.every((idx) => {
							return idx >= 0;
						});
						if(hasAllModules) {
							if(chunkModuleNames.length > splitData.modules.length) {
								const selectedModules = moduleIndicies.map(toChunkModuleIndices(chunk.modules));
								newChunk = compilation.addChunk();
								selectedModules.forEach(moveModuleBetween(chunk, newChunk));
								chunk.split(newChunk);
								chunk.name = null;
								newChunk._fromAggressiveSplitting = true;
								if(j < savedSplits.length)
									newChunk._fromAggressiveSplittingIndex = j;
								if(typeof splitData.id === "number") newChunk.id = splitData.id;
								newChunk.origins = chunk.origins.map(copyWithReason);
								chunk.origins = chunk.origins.map(copyWithReason);
								return true;
							} else {
								if(j < savedSplits.length)
									chunk._fromAggressiveSplittingIndex = j;
								chunk.name = null;
								if(typeof splitData.id === "number") chunk.id = splitData.id;
							}
						}
					}
				}
				// 2. for any other chunk which isn't splitted yet, split it
				for(i = 0; i < chunks.length; i++) {
					chunk = chunks[i];
					const size = chunk.size(this.options);
					if(size > maxSize && chunk.modules.length > 1) {
						newChunk = compilation.addChunk();
						const modules = chunk.modules
							.filter(isNotAEntryModule(chunk.entryModule))
							.sort((a, b) => {
								a = a.identifier();
								b = b.identifier();
								if(a > b) return 1;
								if(a < b) return -1;
								return 0;
							});
						for(let k = 0; k < modules.length; k++) {
							chunk.moveModule(modules[k], newChunk);
							const newSize = newChunk.size(this.options);
							const chunkSize = chunk.size(this.options);
							// break early if it's fine
							if(chunkSize < maxSize && newSize < maxSize && newSize >= minSize && chunkSize >= minSize)
								break;
							if(newSize > maxSize && k === 0) {
								// break if there is a single module which is bigger than maxSize
								break;
							}
							if(newSize > maxSize || chunkSize < minSize) {
								// move it back
								newChunk.moveModule(modules[k], chunk);
								// check if it's fine now
								if(newSize < maxSize && newSize >= minSize && chunkSize >= minSize)
									break;
							}
						}
						if(newChunk.modules.length > 0) {
							chunk.split(newChunk);
							chunk.name = null;
							newChunk.origins = chunk.origins.map(copyWithReason);
							chunk.origins = chunk.origins.map(copyWithReason);
							compilation._aggressiveSplittingSplits = (compilation._aggressiveSplittingSplits || []).concat({
								modules: newChunk.modules.map(makeRelative(compiler.context))
							});
							return true;
						} else {
							chunks.splice(chunks.indexOf(newChunk), 1);
						}
					}
				}
			});
			compilation.plugin("record-hash", (records) => {
				// 3. save to made splittings to records
				const minSize = this.options.minSize;
				if(!records.aggressiveSplits) records.aggressiveSplits = [];
				compilation.chunks.forEach((chunk) => {
					if(chunk.hasEntryModule()) return;
					const size = chunk.size(this.options);
					const incorrectSize = size < minSize;
					const modules = chunk.modules.map(makeRelative(compiler.context));
					if(typeof chunk._fromAggressiveSplittingIndex === "undefined") {
						if(incorrectSize) return;
						chunk.recorded = true;
						records.aggressiveSplits.push({
							modules: modules,
							hash: chunk.hash,
							id: chunk.id
						});
					} else {
						let splitData = records.aggressiveSplits[chunk._fromAggressiveSplittingIndex];
						if(splitData.hash !== chunk.hash || incorrectSize) {
							if(chunk._fromAggressiveSplitting) {
								chunk._aggressiveSplittingInvalid = true;
								splitData.invalid = true;
							} else {
								splitData.hash = chunk.hash;
							}
						}
					}
				});
				records.aggressiveSplits = records.aggressiveSplits.filter((splitData) => {
					return !splitData.invalid;
				});
			});
			compilation.plugin("need-additional-seal", (callback) => {
				const invalid = compilation.chunks.some((chunk) => {
					return chunk._aggressiveSplittingInvalid;
				});
				if(invalid)
					return true;
			});
		});
	}
}
module.exports = AggressiveSplittingPlugin;
