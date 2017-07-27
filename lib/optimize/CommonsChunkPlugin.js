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
		this.children = normalizedOptions.children;
		this.async = normalizedOptions.async;
		this.minSize = normalizedOptions.minSize;
		this.ident = __filename + (nextIdent++);
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
			throw new Error(`You can not specify a filename if you use the "async" option.
You can however specify the name of the async chunk by passing the desired string as the "async" option.`);
		}

		/**
		 * Make sure this is either an array or undefined.
		 * "name" can be a string and
		 * "names" a string or an array
		 */
		const chunkNames = options.name || options.names ? [].concat(options.name || options.names) : undefined;
		return {
			chunkNames: chunkNames,
			filenameTemplate: options.filename,
			minChunks: options.minChunks,
			selectedChunks: options.chunks,
			children: options.children,
			async: options.async,
			minSize: options.minSize
		};
	}

	apply(compiler) {
		compiler.plugin("this-compilation", (compilation) => {
			compilation.plugin(["optimize-chunks", "optimize-extracted-chunks"], (chunks) => {
				// only optimize once
				if(compilation[this.ident]) return;
				compilation[this.ident] = true;

				/**
				 * Creates a list of "common"" chunks based on the options.
				 * The list is made up of preexisting or newly created chunks.
				 * - If chunk has the name as specified in the chunkNames it is put in the list
				 * - If no chunk with the name as given in chunkNames exists a new chunk is created and added to the list
				 *
				 * These chunks are the "targets" for extracted modules.
				 */
				const targetChunks = this.getTargetChunks(chunks, compilation, this.chunkNames, this.children, this.async);

				// iterate over all our new chunks
				targetChunks.forEach((targetChunk, idx) => {

					/**
					 * These chunks are subject to get "common" modules extracted and moved to the common chunk
					 */
					const affectedChunks = this.getAffectedChunks(compilation, chunks, targetChunk, targetChunks, idx, this.selectedChunks, this.async, this.children);

					// bail if no chunk is affected
					if(!affectedChunks) {
						return;
					}

					// If we are async create an async chunk now
					// override the "commonChunk" with the newly created async one and use it as commonChunk from now on
					let asyncChunk;
					if(this.async) {
						// If async chunk is one of the affected chunks, just use it
						asyncChunk = affectedChunks.filter(c => c.name === this.async)[0];
						// Elsewise create a new one
						if(!asyncChunk) {
							asyncChunk = this.createAsyncChunk(
								compilation,
								targetChunks.length <= 1 || typeof this.async !== "string" ? this.async :
								targetChunk.name ? `${this.async}-${targetChunk.name}` :
								true,
								targetChunk
							);
						}
						targetChunk = asyncChunk;
					}

					/**
					 * Check which modules are "common" and could be extracted to a "common" chunk
					 */
					const extractableModules = this.getExtractableModules(this.minChunks, affectedChunks, targetChunk);

					// If the minSize option is set check if the size extracted from the chunk is reached
					// else bail out here.
					// As all modules/commons are interlinked with each other, common modules would be extracted
					// if we reach this mark at a later common chunk. (quirky I guess).
					if(this.minSize) {
						const modulesSize = this.calculateModulesSize(extractableModules);
						// if too small, bail
						if(modulesSize < this.minSize)
							return;
					}

					// Remove modules that are moved to commons chunk from their original chunks
					// return all chunks that are affected by having modules removed - we need them later (apparently)
					const chunksWithExtractedModules = this.extractModulesAndReturnAffectedChunks(extractableModules, affectedChunks);

					// connect all extracted modules with the common chunk
					this.addExtractedModulesToTargetChunk(targetChunk, extractableModules);

					// set filenameTemplate for chunk
					if(this.filenameTemplate)
						targetChunk.filenameTemplate = this.filenameTemplate;

					// if we are async connect the blocks of the "reallyUsedChunk" - the ones that had modules removed -
					// with the commonChunk and get the origins for the asyncChunk (remember "asyncChunk === commonChunk" at this moment).
					// bail out
					if(this.async) {
						this.moveExtractedChunkBlocksToTargetChunk(chunksWithExtractedModules, targetChunk);
						asyncChunk.origins = this.extractOriginsOfChunksWithExtractedModules(chunksWithExtractedModules);
						return;
					}

					// we are not in "async" mode
					// connect used chunks with commonChunk - shouldnt this be reallyUsedChunks here?
					this.makeTargetChunkParentOfAffectedChunks(affectedChunks, targetChunk);
				});
				return true;
			});
		});
	}

	getTargetChunks(allChunks, compilation, chunkNames, children, asyncOption) {
		const asyncOrNoSelectedChunk = children || asyncOption;

		// we have specified chunk names
		if(chunkNames) {
			// map chunks by chunkName for quick access
			const allChunksNameMap = allChunks.reduce((map, chunk) => {
				if(chunk.name) {
					map.set(chunk.name, chunk);
				}
				return map;
			}, new Map());

			// Ensure we have a chunk per specified chunk name.
			// Reuse existing chunks if possible
			return chunkNames.map(chunkName => {
				if(allChunksNameMap.has(chunkName)) {
					return allChunksNameMap.get(chunkName);
				}
				// add the filtered chunks to the compilation
				return compilation.addChunk(chunkName);
			});
		}

		// we dont have named chunks specified, so we just take all of them
		if(asyncOrNoSelectedChunk) {
			return allChunks;
		}

		/**
		 * No chunk name(s) was specified nor is this an async/children commons chunk
		 */
		throw new Error(`You did not specify any valid target chunk settings.
Take a look at the "name"/"names" or async/children option.`);
	}

	getAffectedChunks(compilation, allChunks, targetChunk, targetChunks, currentIndex, selectedChunks, asyncOption, children) {
		const asyncOrNoSelectedChunk = children || asyncOption;

		if(Array.isArray(selectedChunks)) {
			return allChunks.filter(chunk => {
				const notCommmonChunk = chunk !== targetChunk;
				const isSelectedChunk = selectedChunks.indexOf(chunk.name) > -1;
				return notCommmonChunk && isSelectedChunk;
			});
		}

		if(asyncOrNoSelectedChunk) {
			// nothing to do here
			if(!targetChunk.chunks) {
				return [];
			}

			return targetChunk.chunks.filter((chunk) => {
				// we only are interested in on-demand chunks
				if(chunk.isInitial())
					return false;

				// we can only move modules from this chunk if the "commonChunk" is the only parent
				if(!asyncOption)
					return chunk.parents.length === 1;

				return true;
			});
		}

		/**
		 * past this point only entry chunks are allowed to become commonChunks
		 */
		if(targetChunk.parents.length > 0) {
			compilation.errors.push(new Error("CommonsChunkPlugin: While running in normal mode it's not allowed to use a non-entry chunk (" + targetChunk.name + ")"));
			return;
		}

		/**
		 * If we find a "targetchunk" that is also a normal chunk (meaning it is probably specified as an entry)
		 * and the current target chunk comes after that and the found chunk has a runtime*
		 * make that chunk be an 'affected' chunk of the current target chunk.
		 *
		 * To understand what that means take a look at the "examples/chunkhash", this basically will
		 * result in the runtime to be extracted to the current target chunk.
		 *
		 * *runtime: the "runtime" is the "webpack"-block you may have seen in the bundles that resolves modules etc.
		 */
		return allChunks.filter((chunk) => {
			const found = targetChunks.indexOf(chunk);
			if(found >= currentIndex) return false;
			return chunk.hasRuntime();
		});
	}

	createAsyncChunk(compilation, asyncOption, targetChunk) {
		const asyncChunk = compilation.addChunk(typeof asyncOption === "string" ? asyncOption : undefined);
		asyncChunk.chunkReason = "async commons chunk";
		asyncChunk.extraAsync = true;
		asyncChunk.addParent(targetChunk);
		targetChunk.addChunk(asyncChunk);
		return asyncChunk;
	}

	// If minChunks is a function use that
	// otherwhise check if a module is used at least minChunks or 2 or usedChunks.length time
	getModuleFilter(minChunks, targetChunk, usedChunksLength) {
		if(typeof minChunks === "function") {
			return minChunks;
		}
		const minCount = (minChunks || Math.max(2, usedChunksLength));
		const isUsedAtLeastMinTimes = (module, count) => count >= minCount;
		return isUsedAtLeastMinTimes;
	}

	getExtractableModules(minChunks, usedChunks, targetChunk) {
		if(minChunks === Infinity) {
			return [];
		}

		// count how many chunks contain a module
		const commonModulesToCountMap = usedChunks.reduce((map, chunk) => {
			for(const module of chunk.modulesIterable) {
				const count = map.has(module) ? map.get(module) : 0;
				map.set(module, count + 1);
			}
			return map;
		}, new Map());

		// filter by minChunks
		const moduleFilterCount = this.getModuleFilter(minChunks, targetChunk, usedChunks.length);
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
			return moduleFilterCount(module, count) && moduleFilterCondition(module, targetChunk);
		}).map(entry => entry[0]);
	}

	calculateModulesSize(modules) {
		return modules.reduce((totalSize, module) => totalSize + module.size(), 0);
	}

	extractModulesAndReturnAffectedChunks(reallyUsedModules, usedChunks) {
		return reallyUsedModules.reduce((affectedChunksSet, module) => {
			for(const chunk of usedChunks) {
				// removeChunk returns true if the chunk was contained and succesfully removed
				// false if the module did not have a connection to the chunk in question
				if(module.removeChunk(chunk)) {
					affectedChunksSet.add(chunk);
				}
			}
			return affectedChunksSet;
		}, new Set());
	}

	addExtractedModulesToTargetChunk(chunk, modules) {
		for(const module of modules) {
			chunk.addModule(module);
			module.addChunk(chunk);
		}
	}

	makeTargetChunkParentOfAffectedChunks(usedChunks, commonChunk) {
		for(const chunk of usedChunks) {
			// set commonChunk as new sole parent
			chunk.parents = [commonChunk];
			// add chunk to commonChunk
			commonChunk.addChunk(chunk);

			for(const entrypoint of chunk.entrypoints) {
				entrypoint.insertChunk(commonChunk, chunk);
			}
		}
	}

	moveExtractedChunkBlocksToTargetChunk(chunks, targetChunk) {
		for(const chunk of chunks) {
			if(chunk === targetChunk) continue;
			for(const block of chunk.blocks) {
				if(block.chunks.indexOf(targetChunk) === -1) {
					block.chunks.unshift(targetChunk);
				}
				targetChunk.addBlock(block);
			}
		}
	}

	extractOriginsOfChunksWithExtractedModules(chunks) {
		const origins = [];
		for(const chunk of chunks) {
			for(const origin of chunk.origins) {
				const newOrigin = Object.create(origin);
				newOrigin.reasons = (origin.reasons || []).concat("async commons");
				origins.push(newOrigin);
			}
		}
		return origins;
	}
}

module.exports = CommonsChunkPlugin;
