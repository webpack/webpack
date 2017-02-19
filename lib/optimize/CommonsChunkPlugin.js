/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
let nextIdent = 0;
class CommonsChunkPlugin {
	constructor(options) {
		if(arguments.length > 1) {
			throw new Error(`Deprecation notice: CommonsChunkPlugin now only takes a single argument. Either an options
object *or* the name of the chunk.
Example: if your old code looked like this:
	new webpack.optimize.CommonsChunkPlugin('vendor', 'vendor.bundle.js')
You would change it to:
	new webpack.optimize.CommonsChunkPlugin({ name: 'vendor', filename: 'vendor.bundle.js' })
The available options are:
	name: string
	names: string[]
	filename: string
	minChunks: number
	chunks: string[]
	children: boolean
	async: boolean
	minSize: number`);
		}

		const normalizedOptions = this.normalizeOptions(options);

		this.chunkNames = normalizedOptions.chunkNames;
		this.filenameTemplate = this.filenameTemplate;
		this.minChunks = normalizedOptions.minChunks;
		this.selectedChunks = normalizedOptions.selectedChunks;
		this.async = normalizedOptions.async;
		this.minSize = normalizedOptions.minSize;
		this.ident = normalizedOptions.ident;
	}

	normalizeOptions(options) {
		if(Array.isArray(options)) {
			return {
				chunkNames: options,
			};
		}

		if(typeof options === "string") {
			return {
				chunkNames: [options],
			};
		}

		// if "children" is set, set selectedChunks to false instead of specified chunks
		// TODO: why? :P
		const selectedChunks = options.children ? false : options.chunks;
		const chunkNames = options.name ? [options.name] : options.names;
		return {
			chunkNames: chunkNames,
			filenameTemplate: options.filename,
			minChunks: options.minChunks,
			selectedChunks: selectedChunks,
			async: options.async,
			minSize: options.minSize,
			ident: __filename + (nextIdent++),
		};
	}

	getCommonChunks(allChunks, compilation) {
		const asyncOrNoSelectedChunk = this.selectedChunks === false || this.async;

		// we have specified chunk names
		if(this.chunkNames) {
			// map chunks by chunkName for quick access
			const optimizedChunkMap = allChunks.reduce((map, chunk) => {
				map.set(chunk.name, chunk);
				return map;
			}, new Map());

			// Ensure we have a chunk per specified chunk name.
			// Reuse existing chunks if possible
			return this.chunkNames.map(chunkName => {
				if(optimizedChunkMap.has(chunkName)) {
					return optimizedChunkMap.get(chunkName);
				}
				// add the filtered chunks to the compilation
				return compilation.addChunk(chunkName);
			});
		}

		// we dont have named chunks specified, so we just take all of them
		if(asyncOrNoSelectedChunk) {
			return allChunks;
		}

		// that is not supposed to happen, lets throw
		throw new Error("Invalid chunkNames argument");
	}

	getUsedChunks(compilation, allChunks, commonChunk, commonChunks, currentIndex, selectedChunks, isAsync) {
		const asyncOrNoSelectedChunk = selectedChunks === false || isAsync;

		if(Array.isArray(selectedChunks)) {
			return allChunks.filter(chunk => {
				const notCommmonChunk = chunk !== commonChunk;
				const isSelectedChunk = selectedChunks.indexOf(chunk.name) > -1;
				return notCommmonChunk && isSelectedChunk;
			});
		}

		if(asyncOrNoSelectedChunk) {
			// nothing to do here
			if(!commonChunk.chunks) {
				return [];
			}

			return commonChunk.chunks.filter((chunk) => {
				// we can only move modules from this chunk if the "commonChunk" is the only parent
				return isAsync || chunk.parents.length === 1;
			});
		}

		// this is an entry point - bad
		if(commonChunk.parents.length > 0) {
			compilation.errors.push(new Error("CommonsChunkPlugin: While running in normal mode it's not allowed to use a non-entry chunk (" + commonChunk.name + ")"));
			return;
		}

		return allChunks.filter((chunk) => {
			const found = commonChunks.indexOf(chunk);
			if(found >= currentIndex) return false;
			return chunk.hasRuntime();
		});
	}

	createAsyncChunk(compilation, asyncOption, commonChunk) {
		const asyncChunk = compilation.addChunk(typeof asyncOption === "string" ? asyncOption : undefined);
		asyncChunk.chunkReason = "async commons chunk";
		asyncChunk.extraAsync = true;
		asyncChunk.addParent(commonChunk);
		return asyncChunk;
	}

	apply(compiler) {
		const filenameTemplate = this.filenameTemplate;
		const asyncOption = this.async;
		const minSize = this.minSize;
		const ident = this.ident;
		compiler.plugin("this-compilation", (compilation) => {
			compilation.plugin(["optimize-chunks", "optimize-extracted-chunks"], (chunks) => {
				// only optimize once
				if(compilation[ident]) return;
				compilation[ident] = true;

				const commonChunks = this.formCommonChunks(chunks, compilation);

				commonChunks.forEach((commonChunk, idx) => {
					const usedChunks = this.getUsedChunks(compilation, chunks, commonChunk, commonChunks, idx, this.selectedChunks, this.async);
					// bail as this is an erronous state
					if(!usedChunks) {
						return;
					}

					let asyncChunk;
					if(asyncOption) {
						asyncChunk = this.createAsyncChunk(compilation, this.async, commonChunk);
						commonChunk.addChunk(asyncChunk);
						commonChunk = asyncChunk;
					}
					const reallyUsedModules = [];
					if(minChunks !== Infinity) {
						const commonModulesCount = [];
						const commonModules = [];
						usedChunks.forEach((chunk) => {
							chunk.modules.forEach((module) => {
								const idx = commonModules.indexOf(module);
								if(idx < 0) {
									commonModules.push(module);
									commonModulesCount.push(1);
								} else {
									commonModulesCount[idx]++;
								}
							});
						});
						const _minChunks = (minChunks || Math.max(2, usedChunks.length));
						commonModulesCount.forEach((count, idx) => {
							const module = commonModules[idx];
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
						const size = reallyUsedModules.reduce((a, b) => {
							return a + b.size();
						}, 0);
						if(size < minSize)
							return;
					}
					const reallyUsedChunks = new Set();
					reallyUsedModules.forEach((module) => {
						usedChunks.forEach((chunk) => {
							if(module.removeChunk(chunk)) {
								reallyUsedChunks.add(chunk);
							}
						});
						commonChunk.addModule(module);
						module.addChunk(commonChunk);
					});
					if(asyncOption) {
						for(let chunk of reallyUsedChunks) {
							if(chunk.isInitial()) continue;
							chunk.blocks.forEach((block) => {
								block.chunks.unshift(commonChunk);
								commonChunk.addBlock(block);
							});
						}
						asyncChunk.origins = Array.from(reallyUsedChunks).map((chunk) => {
							return chunk.origins.map((origin) => {
								const newOrigin = Object.create(origin);
								newOrigin.reasons = (origin.reasons || []).slice();
								newOrigin.reasons.push("async commons");
								return newOrigin;
							});
						}).reduce((arr, a) => {
							arr.push.apply(arr, a);
							return arr;
						}, []);
					} else {
						usedChunks.forEach((chunk) => {
							chunk.parents = [commonChunk];
							chunk.entrypoints.forEach((ep) => {
								ep.insertChunk(commonChunk, chunk);
							});
							commonChunk.addChunk(chunk);
						});
					}
					if(filenameTemplate)
						commonChunk.filenameTemplate = filenameTemplate;
				});
				return true;
			});
		});
	}
}

module.exports = CommonsChunkPlugin;
