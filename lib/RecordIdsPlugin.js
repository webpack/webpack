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
		compiler.hooks.compilation.tap("RecordIdsPlugin", compilation => {
			compilation.hooks.recordModules.tap(
				"RecordIdsPlugin",
				(modules, records) => {
					if (!records.modules) records.modules = {};
					if (!records.modules.byIdentifier) records.modules.byIdentifier = {};
					if (!records.modules.usedIds) records.modules.usedIds = {};
					for (const module of modules) {
						if (typeof module.id !== "number") continue;
						const identifier = portableIds
							? identifierUtils.makePathsRelative(
									compiler.context,
									module.identifier(),
									compilation.cache
							  )
							: module.identifier();
						records.modules.byIdentifier[identifier] = module.id;
						records.modules.usedIds[module.id] = module.id;
					}
				}
			);
			compilation.hooks.reviveModules.tap(
				"RecordIdsPlugin",
				(modules, records) => {
					if (!records.modules) return;
					if (records.modules.byIdentifier) {
						const usedIds = new Set();
						for (const module of modules) {
							if (module.id !== null) continue;
							const identifier = portableIds
								? identifierUtils.makePathsRelative(
										compiler.context,
										module.identifier(),
										compilation.cache
								  )
								: module.identifier();
							const id = records.modules.byIdentifier[identifier];
							if (id === undefined) continue;
							if (usedIds.has(id)) continue;
							usedIds.add(id);
							module.id = id;
						}
					}
					if (Array.isArray(records.modules.usedIds)) {
						compilation.usedModuleIds = new Set(records.modules.usedIds);
					}
				}
			);

			const getModuleIdentifier = module => {
				if (portableIds) {
					return identifierUtils.makePathsRelative(
						compiler.context,
						module.identifier(),
						compilation.cache
					);
				}
				return module.identifier();
			};

			const getChunkSources = chunk => {
				const sources = [];
				for (const chunkGroup of chunk.groupsIterable) {
					const index = chunkGroup.chunks.indexOf(chunk);
					for (const origin of chunkGroup.origins) {
						if (origin.module) {
							if (origin.request) {
								sources.push(
									`${index} ${getModuleIdentifier(origin.module)} ${
										origin.request
									}`
								);
							} else if (typeof origin.loc === "string") {
								sources.push(
									`${index} ${getModuleIdentifier(origin.module)} ${origin.loc}`
								);
							} else if (
								origin.loc &&
								typeof origin.loc === "object" &&
								origin.loc.start
							) {
								sources.push(
									`${index} ${getModuleIdentifier(
										origin.module
									)} ${JSON.stringify(origin.loc.start)}`
								);
							}
						}
					}
				}
				return sources;
			};

			compilation.hooks.recordChunks.tap(
				"RecordIdsPlugin",
				(chunks, records) => {
					if (!records.chunks) records.chunks = {};
					if (!records.chunks.byName) records.chunks.byName = {};
					if (!records.chunks.bySource) records.chunks.bySource = {};
					const usedIds = new Set();
					for (const chunk of chunks) {
						if (typeof chunk.id !== "number") continue;
						const name = chunk.name;
						if (name) records.chunks.byName[name] = chunk.id;
						const sources = getChunkSources(chunk);
						for (const source of sources) {
							records.chunks.bySource[source] = chunk.id;
						}
						usedIds.add(chunk.id);
					}
					records.chunks.usedIds = Array.from(usedIds).sort();
				}
			);
			compilation.hooks.reviveChunks.tap(
				"RecordIdsPlugin",
				(chunks, records) => {
					if (!records.chunks) return;
					const usedIds = new Set();
					if (records.chunks.byName) {
						for (const chunk of chunks) {
							if (chunk.id !== null) continue;
							if (!chunk.name) continue;
							const id = records.chunks.byName[chunk.name];
							if (id === undefined) continue;
							if (usedIds.has(id)) continue;
							usedIds.add(id);
							chunk.id = id;
						}
					}
					if (records.chunks.bySource) {
						for (const chunk of chunks) {
							const sources = getChunkSources(chunk);
							for (const source of sources) {
								const id = records.chunks.bySource[source];
								if (id === undefined) continue;
								if (usedIds[id]) continue;
								usedIds[id] = true;
								chunk.id = id;
								break;
							}
						}
					}
					if (Array.isArray(records.chunks.usedIds)) {
						compilation.usedChunkIds = new Set(records.chunks.usedIds);
					}
				}
			);
		});
	}
}
module.exports = RecordIdsPlugin;
