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
		this.filenameTemplate = normalizedOptions.filenameTemplate;
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

		// options.children and options.chunk may not be used together
		if(options.children && options.chunks) {
			throw new Error("You can't and it does not make any sense to use \"children\" and \"chunk\" options together.");
		}

		/**
		 * options.async and options.filename are also not possible together
		 * as filename specifies how the chunk is called but "async" implies
		 * that webpack will take care of loading this file.
		 */
		if(options.async && options.filename) {
			throw new Error("If you set the \"async\" option webpack takes care of loading the chunk. Therefore you can not specify a filename.");
		}

		const chunkNames = options.name ? [options.name] : options.names;
		return {
			chunkNames: chunkNames,
			filenameTemplate: options.filename,
			minChunks: options.minChunks,
			selectedChunks: options.chunks,
			children: options.children,
			async: options.async,
			minSize: options.minSize,
			ident: __filename + (nextIdent++),
		};
	}

	apply(compiler) {
		const filenameTemplate = this.filenameTemplate;
		const asyncOption = this.async;
		const minSize = this.minSize;
		const minChunks = this.minChunks;
		const ident = this.ident;
		compiler.plugin("this-compilation", (compilation) => {
			compilation.plugin(["optimize-chunks", "optimize-extracted-chunks"], (chunks) => {
				// only optimize once
				if(compilation[ident]) return;
				compilation[ident] = true;

				/**
				 * Creates a list of common chunks based on the options.
				 * The list is made up of preexisting or newly created chunks.
				 * - If chunk has the name as specified in the chunkNames it is put in the list
				 * - If no chunk with the name as given in chunkNames exists a new chunk is created and added to the list
				 */
				const commonChunks = this.getCommonChunks(chunks, compilation, this.chunkNames, this.selectedChunks, this.async);

				// iterate over all our new chunks
				commonChunks.forEach((commonChunk, idx) => {
					// get chunks that are actually used
					// TODO: clarify what that means
					const usedChunks = this.getUsedChunks(compilation, chunks, commonChunk, commonChunks, idx, this.selectedChunks, this.async);

					// bail as this is an erronous state
					if(!usedChunks) {
						return;
					}

					// If we are async create an async chunk now
					// override the "commonChunk" with the newly created async one and use it as commonChunk from now on
					let asyncChunk;
					if(asyncOption) {
						asyncChunk = this.createAsyncChunk(compilation, this.async, commonChunk);
						commonChunk.addChunk(asyncChunk);
						commonChunk = asyncChunk;
					}

					// get all modules that suffice the filter e.g. are used at least in "n" chunks
					// TODO: what does "really used modules mean here"?
					const reallyUsedModules = this.getReallyUsedModules(minChunks, usedChunks, commonChunk);

					// If the minSize option is set check if the size extracted from the chunk is reached
					// else bail out here.
					// As all modules/commons are interlinked with each other, common modules would be extracted
					// if we reach this mark at a later common chunk. (quirky I guess).
					if(minSize) {
						const modulesSize = this.getModulesSize(reallyUsedModules);
						// if too small, bail
						if(modulesSize < minSize)
							return;
					}

					// Remove modules that are moved to commons chunk from their original chunks
					// return all chunks that are affected by having modules removed - we need them later (apparently)
					const reallyUsedChunks = this.removeModulesFromUsedChunksAndReturnUsedChunks(reallyUsedModules, usedChunks);

					// connect all extracted modules with the common chunk
					this.connectModulesWithCommonChunk(commonChunk, reallyUsedModules);

					// set filenameTemplate for chunk
					if(filenameTemplate)
						commonChunk.filenameTemplate = filenameTemplate;

					// if we are async connect the blocks of the "reallyUsedChunk" - the ones that had modules removed -
					// with the commonChunk and get the origins for the asyncChunk (remember "asyncChunk === commonChunk" at this moment).
					// bail out
					if(asyncOption) {
						this.connectChunkBlocksWithCommonChunk(reallyUsedChunks, commonChunk);
						asyncChunk.origins = this.getAsyncChunkOrigin(reallyUsedChunks);
						return;
					}

					// we are not in "async" mode
					// connect used chunks with commonChunk - shouldnt this be reallyUsedChunks here?
					this.addCommonChunkAsParentOfAffectedChunks(usedChunks, commonChunk);
				});
				return true;
			});
		});
	}

	getCommonChunks(allChunks, compilation, chunkNames, selectedChunks, asyncOption) {
		const asyncOrNoSelectedChunk = selectedChunks === false || asyncOption;

		// we have specified chunk names
		if(chunkNames) {
			// map chunks by chunkName for quick access
			const optimizedChunkMap = allChunks.reduce((map, chunk) => {
				map.set(chunk.name, chunk);
				return map;
			}, new Map());

			// Ensure we have a chunk per specified chunk name.
			// Reuse existing chunks if possible
			return chunkNames.map(chunkName => {
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

	getUsedChunks(compilation, allChunks, commonChunk, commonChunks, currentIndex, selectedChunks, asyncOption) {
		const asyncOrNoSelectedChunk = selectedChunks === false || asyncOption;

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
				return asyncOption || chunk.parents.length === 1;
			});
		}

		// this is an entry point - bad
		if(commonChunk.parents.length > 0) {
			compilation.errors.push(new Error("CommonsChunkPlugin: While running in normal mode it's not allowed to use a non-entry chunk (" + commonChunk.name + ")"));
			return;
		}

		// what is this?
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

	// If minChunks is a function use that
	// otherwhise check if a module is used at least minChunks or 2 or usedChunks.length time
	getModuleFilter(minChunks, commonChunk, usedChunksLength) {
		if(typeof minChunks === "function") {
			return minChunks;
		}
		const minCount = (minChunks || Math.max(2, usedChunksLength));
		const isUsedAtLeastMinTimes = (module, count) => count >= minCount;
		return isUsedAtLeastMinTimes;
	}

	getReallyUsedModules(minChunks, usedChunks, commonChunk) {
		if(minChunks === Infinity) {
			return [];
		}

		// count how many chunks contain a module
		const commonModulesToCountMap = usedChunks.reduce((map, chunk) => {
			for(let module of chunk.modules) {
				let count = map.has(module) ? map.get(module) : 0;
				map.set(module, count + 1);
			}
			return map;
		}, new Map());

		// filter by minChunks
		const moduleFilterCount = this.getModuleFilter(minChunks, commonChunk, usedChunks.length);
		// filter by condition
		const moduleFilterCondition = (module, chunk) => {
			if(!module.chunkCondition) {
				return true;
			}
			return module.chunkCondition(chunk);
		};

		return Array.from(commonModulesToCountMap).filter(entry => {
			const module = entry[0];
			const count = entry[1];
			// if the module passes both filters, keep it.
			return moduleFilterCount(module, count) && moduleFilterCondition(module, commonChunk);
		}).map(entry => entry[0]);
	}

	getModulesSize(modules) {
		return modules.reduce((count, module) => count + module.size(), 0);
	}

	removeModulesFromUsedChunksAndReturnUsedChunks(reallyUsedModules, usedChunks) {
		return reallyUsedModules.reduce((affectedChunksSet, module) => {
			for(let chunk of usedChunks) {
				// removeChunk returns true if the chunk was contained and succesfully removed
				// false if the module did not have a connection to the chunk in question
				if(module.removeChunk(chunk)) {
					affectedChunksSet.add(chunk);
				}
			}
			return affectedChunksSet;
		}, new Set());
	}

	connectModulesWithCommonChunk(chunk, modules) {
		for(let module of modules) {
			chunk.addModule(module);
			module.addChunk(chunk);
		}
	}

	addCommonChunkAsParentOfAffectedChunks(usedChunks, commonChunk) {
		for(let chunk of usedChunks) {
			// set commonChunk as new sole parent
			chunk.parents = [commonChunk];
			// add chunk to commonChunk
			commonChunk.addChunk(chunk);

			for(let entrypoint of chunk.entrypoints) {
				entrypoint.insertChunk(commonChunk, chunk);
			}
		}
	}

	connectChunkBlocksWithCommonChunk(chunks, commonChunk) {
		for(let chunk of chunks) {
			// only for non initial chunks
			// TODO: why?
			if(!chunk.isInitial()) {
				for(let block of chunk.blocks) {
					block.chunks.unshift(commonChunk);
					commonChunk.addBlock(block);
				}
			}
		}
	}

	getAsyncChunkOrigin(chunks) {
		const origins = [];
		for(let chunk of chunks) {
			for(let origin of chunk.origins) {
				const newOrigin = Object.create(origin);
				newOrigin.reasons = (origin.reasons || []).concat("async commons");
				origins.push(newOrigin);
			}
		}
		return origins;
	}
}

module.exports = CommonsChunkPlugin;
