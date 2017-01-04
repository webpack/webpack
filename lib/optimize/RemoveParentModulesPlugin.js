/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

function chunkContainsModule(chunk, module) {
	const chunks = module.chunks;
	const modules = chunk.modules;
	if(chunks.length < modules.length) {
		return chunks.indexOf(chunk) >= 0;
	} else {
		return modules.indexOf(module) >= 0;
	}
}

function hasModule(chunk, module, checkedChunks) {
	if(chunkContainsModule(chunk, module)) return [chunk];
	if(chunk.parents.length === 0) return false;
	return allHaveModule(chunk.parents.filter((c) => {
		return checkedChunks.indexOf(c) < 0;
	}), module, checkedChunks);
}

function allHaveModule(someChunks, module, checkedChunks) {
	if(!checkedChunks) checkedChunks = [];
	let chunks = [];
	for(var i = 0; i < someChunks.length; i++) {
		checkedChunks.push(someChunks[i]);
		const subChunks = hasModule(someChunks[i], module, checkedChunks);
		if(!subChunks) return false;
		addToSet(chunks, subChunks);
	}
	return chunks;
}

function addToSet(set, items) {
	items.forEach((item) => {
		if(set.indexOf(item) < 0)
			set.push(item);
	});
}

function debugIds(chunks) {
	const list = chunks.map((chunk) => {
		return chunk.debugId;
	});
	const debugIdMissing = list.some((dId) => {
		return typeof dId !== "number";
	});
	if(debugIdMissing)
		return "no";
	list.sort();
	return list.join(",");
}

class RemoveParentModulesPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation) => {
			compilation.plugin(["optimize-chunks-basic", "optimize-extracted-chunks-basic"], (chunks) => {
				chunks.forEach((chunk) => {
					const cache = {};
					chunk.modules.slice().forEach((module) => {
						if(chunk.parents.length === 0) return;
						const dId = "$" + debugIds(module.chunks);
						let parentChunksWithModule;
						if((dId in cache) && dId !== "$no") {
							parentChunksWithModule = cache[dId];
						} else {
							parentChunksWithModule = cache[dId] = allHaveModule(chunk.parents, module);
						}
						if(parentChunksWithModule) {
							module.rewriteChunkInReasons(chunk, parentChunksWithModule);
							chunk.removeModule(module);
						}
					});
				});
			});
		});
	}
}
module.exports = RemoveParentModulesPlugin;
