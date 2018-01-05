/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const identifierUtils = require("./util/identifier");

class RecordIdsPlugin {
	constructor(options) {
		this.options = options || {};
	}

	apply(compiler) {
		const portableIds = this.options.portableIds;
		compiler.hooks.compilation.tap("RecordIdsPlugin", (compilation) => {
			compilation.hooks.recordModules.tap("RecordIdsPlugin", (modules, records) => {
				if(!records.modules) records.modules = {};
				if(!records.modules.byIdentifier) records.modules.byIdentifier = {};
				if(!records.modules.usedIds) records.modules.usedIds = {};
				modules.forEach(module => {
					const identifier = portableIds ? identifierUtils.makePathsRelative(compiler.context, module.identifier(), compilation.cache) : module.identifier();
					records.modules.byIdentifier[identifier] = module.id;
					records.modules.usedIds[module.id] = module.id;
				});
			});
			compilation.hooks.reviveModules.tap("RecordIdsPlugin", (modules, records) => {
				if(!records.modules) return;
				if(records.modules.byIdentifier) {
					const usedIds = new Set();
					modules.forEach(module => {
						if(module.id !== null) return;
						const identifier = portableIds ? identifierUtils.makePathsRelative(compiler.context, module.identifier(), compilation.cache) : module.identifier();
						const id = records.modules.byIdentifier[identifier];
						if(id === undefined) return;
						if(usedIds.has(id)) return;
						usedIds.add(id);
						module.id = id;
					});
				}
				compilation.usedModuleIds = records.modules.usedIds;
			});

			const getDepBlockIdent = (chunk, block) => {
				const ident = [];
				if(block.chunks.length > 1)
					ident.push(block.chunks.indexOf(chunk));
				while(block.parent) {
					const p = block.parent;
					const idx = p.blocks.indexOf(block);
					const l = p.blocks.length - 1;
					ident.push(`${idx}/${l}`);
					block = block.parent;
				}
				if(!block.identifier) return null;
				const identifier = portableIds ? identifierUtils.makePathsRelative(compiler.context, block.identifier(), compilation.cache) : block.identifier();
				ident.push(identifier);
				return ident.reverse().join(":");
			};

			compilation.hooks.recordChunks.tap("RecordIdsPlugin", (chunks, records) => {
				records.nextFreeChunkId = compilation.nextFreeChunkId;
				if(!records.chunks) records.chunks = {};
				if(!records.chunks.byName) records.chunks.byName = {};
				if(!records.chunks.byBlocks) records.chunks.byBlocks = {};
				records.chunks.usedIds = {};
				chunks.forEach(chunk => {
					const name = chunk.name;
					const blockIdents = chunk.mapBlocks(getDepBlockIdent.bind(null, chunk)).filter(Boolean);
					if(name) records.chunks.byName[name] = chunk.id;
					blockIdents.forEach((blockIdent) => {
						records.chunks.byBlocks[blockIdent] = chunk.id;
					});
					records.chunks.usedIds[chunk.id] = chunk.id;
				});
			});
			compilation.hooks.reviveChunks.tap("RecordIdsPlugin", (chunks, records) => {
				if(!records.chunks) return;
				const usedIds = new Set();
				if(records.chunks.byName) {
					chunks.forEach(chunk => {
						if(chunk.id !== null) return;
						if(!chunk.name) return;
						const id = records.chunks.byName[chunk.name];
						if(id === undefined) return;
						if(usedIds.has(id)) return;
						usedIds.add(id);
						chunk.id = id;
					});
				}
				if(records.chunks.byBlocks) {
					const argumentedChunks = chunks.filter(chunk => chunk.id === null).map(chunk => ({
						chunk,
						blockIdents: chunk.mapBlocks(getDepBlockIdent.bind(null, chunk)).filter(Boolean)
					})).filter(arg => arg.blockIdents.length > 0);
					let blockIdentsCount = {};
					argumentedChunks.forEach((arg, idx) => {
						arg.blockIdents.forEach(blockIdent => {
							const id = records.chunks.byBlocks[blockIdent];
							if(typeof id !== "number") return;
							const accessor = `${id}:${idx}`;
							blockIdentsCount[accessor] = (blockIdentsCount[accessor] || 0) + 1;
						});
					});
					blockIdentsCount = Object.keys(blockIdentsCount).map(accessor => [blockIdentsCount[accessor]].concat(accessor.split(":").map(Number))).sort((a, b) => b[0] - a[0]);
					blockIdentsCount.forEach(arg => {
						const id = arg[1];
						if(usedIds.has(id)) return;
						const idx = arg[2];
						const chunk = argumentedChunks[idx].chunk;
						if(chunk.id !== null) return;
						usedIds.add(id);
						chunk.id = id;
					});
				}
				compilation.usedChunkIds = records.chunks.usedIds;
			});
		});
	}
}
module.exports = RecordIdsPlugin;
