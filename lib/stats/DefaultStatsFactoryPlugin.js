/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const util = require("util");
const ModuleDependency = require("../dependencies/ModuleDependency");
const formatLocation = require("../formatLocation");
const { LogType } = require("../logging/Logger");
const AggressiveSplittingPlugin = require("../optimize/AggressiveSplittingPlugin");
const SizeLimitsPlugin = require("../performance/SizeLimitsPlugin");
const { countIterable } = require("../util/IterableHelpers");
const {
	compareLocations,
	compareChunksById,
	compareNumbers,
	compareIds,
	concatComparators,
	compareSelect,
	compareModulesByIdentifier
} = require("../util/comparators");
const { makePathsRelative, parseResource } = require("../util/identifier");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../ChunkGroup").OriginRecord} OriginRecord */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compilation").Asset} Asset */
/** @typedef {import("../Compilation").AssetInfo} AssetInfo */
/** @typedef {import("../Compilation").NormalizedStatsOptions} NormalizedStatsOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleProfile")} ModuleProfile */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../WebpackError")} WebpackError */
/** @template T @typedef {import("../util/comparators").Comparator<T>} Comparator<T> */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../util/smartGrouping").GroupConfig<any, object>} GroupConfig */
/** @typedef {import("./StatsFactory")} StatsFactory */
/** @typedef {import("./StatsFactory").StatsFactoryContext} StatsFactoryContext */

/** @typedef {KnownStatsCompilation & Record<string, any>} StatsCompilation */
/**
 * @typedef {Object} KnownStatsCompilation
 * @property {any=} env
 * @property {string=} name
 * @property {string=} hash
 * @property {string=} version
 * @property {number=} time
 * @property {number=} builtAt
 * @property {boolean=} needAdditionalPass
 * @property {string=} publicPath
 * @property {string=} outputPath
 * @property {Record<string, string[]>=} assetsByChunkName
 * @property {StatsAsset[]=} assets
 * @property {number=} filteredAssets
 * @property {StatsChunk[]=} chunks
 * @property {StatsModule[]=} modules
 * @property {number=} filteredModules
 * @property {Record<string, StatsChunkGroup>=} entrypoints
 * @property {Record<string, StatsChunkGroup>=} namedChunkGroups
 * @property {StatsError[]=} errors
 * @property {number=} errorsCount
 * @property {StatsError[]=} warnings
 * @property {number=} warningsCount
 * @property {StatsCompilation[]=} children
 * @property {Record<string, StatsLogging>=} logging
 */

/** @typedef {KnownStatsLogging & Record<string, any>} StatsLogging */
/**
 * @typedef {Object} KnownStatsLogging
 * @property {StatsLoggingEntry[]} entries
 * @property {number} filteredEntries
 * @property {boolean} debug
 */

/** @typedef {KnownStatsLoggingEntry & Record<string, any>} StatsLoggingEntry */
/**
 * @typedef {Object} KnownStatsLoggingEntry
 * @property {string} type
 * @property {string} message
 * @property {string[]=} trace
 * @property {StatsLoggingEntry[]=} children
 * @property {any[]=} args
 * @property {number=} time
 */

/** @typedef {KnownStatsAsset & Record<string, any>} StatsAsset */
/**
 * @typedef {Object} KnownStatsAsset
 * @property {string} type
 * @property {string} name
 * @property {AssetInfo} info
 * @property {number} size
 * @property {boolean} emitted
 * @property {boolean} comparedForEmit
 * @property {boolean} cached
 * @property {StatsAsset[]=} related
 * @property {(string|number)[]=} chunkNames
 * @property {(string|number)[]=} chunkIdHints
 * @property {(string|number)[]=} chunks
 * @property {(string|number)[]=} auxiliaryChunkNames
 * @property {(string|number)[]=} auxiliaryChunks
 * @property {(string|number)[]=} auxiliaryChunkIdHints
 * @property {number=} filteredRelated
 * @property {boolean=} isOverSizeLimit
 */

/** @typedef {KnownStatsChunkGroup & Record<string, any>} StatsChunkGroup */
/**
 * @typedef {Object} KnownStatsChunkGroup
 * @property {string=} name
 * @property {(string|number)[]=} chunks
 * @property {({ name: string, size?: number })[]=} assets
 * @property {number=} filteredAssets
 * @property {number=} assetsSize
 * @property {({ name: string, size?: number })[]=} auxiliaryAssets
 * @property {number=} filteredAuxiliaryAssets
 * @property {number=} auxiliaryAssetsSize
 * @property {{ [x: string]: StatsChunkGroup[] }=} children
 * @property {{ [x: string]: string[] }=} childAssets
 * @property {boolean=} isOverSizeLimit
 */

/** @typedef {KnownStatsModule & Record<string, any>} StatsModule */
/**
 * @typedef {Object} KnownStatsModule
 * @property {string=} type
 * @property {string=} moduleType
 * @property {string=} layer
 * @property {string=} identifier
 * @property {string=} name
 * @property {string=} nameForCondition
 * @property {number=} index
 * @property {number=} preOrderIndex
 * @property {number=} index2
 * @property {number=} postOrderIndex
 * @property {number=} size
 * @property {{[x: string]: number}=} sizes
 * @property {boolean=} cacheable
 * @property {boolean=} built
 * @property {boolean=} codeGenerated
 * @property {boolean=} buildTimeExecuted
 * @property {boolean=} cached
 * @property {boolean=} optional
 * @property {boolean=} orphan
 * @property {string|number=} id
 * @property {string|number=} issuerId
 * @property {(string|number)[]=} chunks
 * @property {(string|number)[]=} assets
 * @property {boolean=} dependent
 * @property {string=} issuer
 * @property {string=} issuerName
 * @property {StatsModuleIssuer[]=} issuerPath
 * @property {boolean=} failed
 * @property {number=} errors
 * @property {number=} warnings
 * @property {StatsProfile=} profile
 * @property {StatsModuleReason[]=} reasons
 * @property {(boolean | string[])=} usedExports
 * @property {string[]=} providedExports
 * @property {string[]=} optimizationBailout
 * @property {number=} depth
 * @property {StatsModule[]=} modules
 * @property {number=} filteredModules
 * @property {ReturnType<Source["source"]>=} source
 */

/** @typedef {KnownStatsProfile & Record<string, any>} StatsProfile */
/**
 * @typedef {Object} KnownStatsProfile
 * @property {number} total
 * @property {number} resolving
 * @property {number} restoring
 * @property {number} building
 * @property {number} integration
 * @property {number} storing
 * @property {number} additionalResolving
 * @property {number} additionalIntegration
 * @property {number} factory
 * @property {number} dependencies
 */

/** @typedef {KnownStatsModuleIssuer & Record<string, any>} StatsModuleIssuer */
/**
 * @typedef {Object} KnownStatsModuleIssuer
 * @property {string=} identifier
 * @property {string=} name
 * @property {(string|number)=} id
 * @property {StatsProfile=} profile
 */

/** @typedef {KnownStatsModuleReason & Record<string, any>} StatsModuleReason */
/**
 * @typedef {Object} KnownStatsModuleReason
 * @property {string=} moduleIdentifier
 * @property {string=} module
 * @property {string=} moduleName
 * @property {string=} resolvedModuleIdentifier
 * @property {string=} resolvedModule
 * @property {string=} type
 * @property {boolean} active
 * @property {string=} explanation
 * @property {string=} userRequest
 * @property {string=} loc
 * @property {(string|number)=} moduleId
 * @property {(string|number)=} resolvedModuleId
 */

/** @typedef {KnownStatsChunk & Record<string, any>} StatsChunk */
/**
 * @typedef {Object} KnownStatsChunk
 * @property {boolean} rendered
 * @property {boolean} initial
 * @property {boolean} entry
 * @property {boolean} recorded
 * @property {string=} reason
 * @property {number} size
 * @property {Record<string, number>=} sizes
 * @property {string[]=} names
 * @property {string[]=} idHints
 * @property {string[]=} runtime
 * @property {string[]=} files
 * @property {string[]=} auxiliaryFiles
 * @property {string} hash
 * @property {Record<string, (string|number)[]>=} childrenByOrder
 * @property {(string|number)=} id
 * @property {(string|number)[]=} siblings
 * @property {(string|number)[]=} parents
 * @property {(string|number)[]=} children
 * @property {StatsModule[]=} modules
 * @property {number=} filteredModules
 * @property {StatsChunkOrigin[]=} origins
 */

/** @typedef {KnownStatsChunkOrigin & Record<string, any>} StatsChunkOrigin */
/**
 * @typedef {Object} KnownStatsChunkOrigin
 * @property {string=} module
 * @property {string=} moduleIdentifier
 * @property {string=} moduleName
 * @property {string=} loc
 * @property {string=} request
 * @property {(string|number)=} moduleId
 */

/** @typedef {KnownStatsModuleTraceItem & Record<string, any>} StatsModuleTraceItem */
/**
 * @typedef {Object} KnownStatsModuleTraceItem
 * @property {string=} originIdentifier
 * @property {string=} originName
 * @property {string=} moduleIdentifier
 * @property {string=} moduleName
 * @property {StatsModuleTraceDependency[]=} dependencies
 * @property {(string|number)=} originId
 * @property {(string|number)=} moduleId
 */

/** @typedef {KnownStatsModuleTraceDependency & Record<string, any>} StatsModuleTraceDependency */
/**
 * @typedef {Object} KnownStatsModuleTraceDependency
 * @property {string=} loc
 */

/** @typedef {KnownStatsError & Record<string, any>} StatsError */
/**
 * @typedef {Object} KnownStatsError
 * @property {string} message
 * @property {string=} chunkName
 * @property {boolean=} chunkEntry
 * @property {boolean=} chunkInitial
 * @property {string=} file
 * @property {string=} moduleIdentifier
 * @property {string=} moduleName
 * @property {string=} loc
 * @property {string|number=} chunkId
 * @property {string|number=} moduleId
 * @property {StatsModuleTraceItem[]=} moduleTrace
 * @property {any=} details
 * @property {string=} stack
 */

/** @typedef {Asset & { type: string, related: PreprocessedAsset[] }} PreprocessedAsset */

/**
 * @template T
 * @template O
 * @typedef {Record<string, (object: O, data: T, context: StatsFactoryContext, options: NormalizedStatsOptions, factory: StatsFactory) => void>} ExtractorsByOption
 */

/**
 * @typedef {Object} SimpleExtractors
 * @property {ExtractorsByOption<Compilation, StatsCompilation>} compilation
 * @property {ExtractorsByOption<PreprocessedAsset, StatsAsset>} asset
 * @property {ExtractorsByOption<PreprocessedAsset, StatsAsset>} asset$visible
 * @property {ExtractorsByOption<{ name: string, chunkGroup: ChunkGroup }, StatsChunkGroup>} chunkGroup
 * @property {ExtractorsByOption<Module, StatsModule>} module
 * @property {ExtractorsByOption<Module, StatsModule>} module$visible
 * @property {ExtractorsByOption<Module, StatsModuleIssuer>} moduleIssuer
 * @property {ExtractorsByOption<ModuleProfile, StatsProfile>} profile
 * @property {ExtractorsByOption<ModuleGraphConnection, StatsModuleReason>} moduleReason
 * @property {ExtractorsByOption<Chunk, StatsChunk>} chunk
 * @property {ExtractorsByOption<OriginRecord, StatsChunkOrigin>} chunkOrigin
 * @property {ExtractorsByOption<WebpackError, StatsError>} error
 * @property {ExtractorsByOption<WebpackError, StatsError>} warning
 * @property {ExtractorsByOption<{ origin: Module, module: Module }, StatsModuleTraceItem>} moduleTraceItem
 * @property {ExtractorsByOption<Dependency, StatsModuleTraceDependency>} moduleTraceDependency
 */

/**
 * @template T
 * @template I
 * @param {Iterable<T>} items items to select from
 * @param {function(T): Iterable<I>} selector selector function to select values from item
 * @returns {I[]} array of values
 */
const uniqueArray = (items, selector) => {
	/** @type {Set<I>} */
	const set = new Set();
	for (const item of items) {
		for (const i of selector(item)) {
			set.add(i);
		}
	}
	return Array.from(set);
};

/**
 * @template T
 * @template I
 * @param {Iterable<T>} items items to select from
 * @param {function(T): Iterable<I>} selector selector function to select values from item
 * @param {Comparator<I>} comparator comparator function
 * @returns {I[]} array of values
 */
const uniqueOrderedArray = (items, selector, comparator) => {
	return uniqueArray(items, selector).sort(comparator);
};

/** @template T @template R @typedef {{ [P in keyof T]: R }} MappedValues<T, R> */

/**
 * @template T
 * @template R
 * @param {T} obj object to be mapped
 * @param {function(T[keyof T], keyof T): R} fn mapping function
 * @returns {MappedValues<T, R>} mapped object
 */
const mapObject = (obj, fn) => {
	const newObj = Object.create(null);
	for (const key of Object.keys(obj)) {
		newObj[key] = fn(obj[key], /** @type {keyof T} */ (key));
	}
	return newObj;
};

/**
 * @param {Compilation} compilation the compilation
 * @param {function(Compilation, string): any[]} getItems get items
 * @returns {number} total number
 */
const countWithChildren = (compilation, getItems) => {
	let count = getItems(compilation, "").length;
	for (const child of compilation.children) {
		count += countWithChildren(child, (c, type) =>
			getItems(c, `.children[].compilation${type}`)
		);
	}
	return count;
};

/** @type {ExtractorsByOption<WebpackError | string, StatsError>} */
const EXTRACT_ERROR = {
	_: (object, error, context, { requestShortener }) => {
		// TODO webpack 6 disallow strings in the errors/warnings list
		if (typeof error === "string") {
			object.message = error;
		} else {
			if (error.chunk) {
				object.chunkName = error.chunk.name;
				object.chunkEntry = error.chunk.hasRuntime();
				object.chunkInitial = error.chunk.canBeInitial();
			}
			if (error.file) {
				object.file = error.file;
			}
			if (error.module) {
				object.moduleIdentifier = error.module.identifier();
				object.moduleName = error.module.readableIdentifier(requestShortener);
			}
			if (error.loc) {
				object.loc = formatLocation(error.loc);
			}
			object.message = error.message;
		}
	},
	ids: (object, error, { compilation: { chunkGraph } }) => {
		if (typeof error !== "string") {
			if (error.chunk) {
				object.chunkId = error.chunk.id;
			}
			if (error.module) {
				object.moduleId = chunkGraph.getModuleId(error.module);
			}
		}
	},
	moduleTrace: (object, error, context, options, factory) => {
		if (typeof error !== "string" && error.module) {
			const {
				type,
				compilation: { moduleGraph }
			} = context;
			/** @type {Set<Module>} */
			const visitedModules = new Set();
			const moduleTrace = [];
			let current = error.module;
			while (current) {
				if (visitedModules.has(current)) break; // circular (technically impossible, but how knows)
				visitedModules.add(current);
				const origin = moduleGraph.getIssuer(current);
				if (!origin) break;
				moduleTrace.push({ origin, module: current });
				current = origin;
			}
			object.moduleTrace = factory.create(
				`${type}.moduleTrace`,
				moduleTrace,
				context
			);
		}
	},
	errorDetails: (
		object,
		error,
		{ type, compilation, cachedGetErrors, cachedGetWarnings },
		{ errorDetails }
	) => {
		if (
			typeof error !== "string" &&
			(errorDetails === true ||
				(type.endsWith(".error") && cachedGetErrors(compilation).length < 3))
		) {
			object.details = error.details;
		}
	},
	errorStack: (object, error) => {
		if (typeof error !== "string") {
			object.stack = error.stack;
		}
	}
};

/** @type {SimpleExtractors} */
const SIMPLE_EXTRACTORS = {
	compilation: {
		_: (object, compilation, context, options) => {
			if (!context.makePathsRelative) {
				context.makePathsRelative = makePathsRelative.bindContextCache(
					compilation.compiler.context,
					compilation.compiler.root
				);
			}
			if (!context.cachedGetErrors) {
				const map = new WeakMap();
				context.cachedGetErrors = compilation => {
					return (
						map.get(compilation) ||
						(errors => (map.set(compilation, errors), errors))(
							compilation.getErrors()
						)
					);
				};
			}
			if (!context.cachedGetWarnings) {
				const map = new WeakMap();
				context.cachedGetWarnings = compilation => {
					return (
						map.get(compilation) ||
						(warnings => (map.set(compilation, warnings), warnings))(
							compilation.getWarnings()
						)
					);
				};
			}
			if (compilation.name) {
				object.name = compilation.name;
			}
			if (compilation.needAdditionalPass) {
				object.needAdditionalPass = true;
			}

			const { logging, loggingDebug, loggingTrace } = options;
			if (logging || (loggingDebug && loggingDebug.length > 0)) {
				const util = require("util");
				object.logging = {};
				let acceptedTypes;
				let collapsedGroups = false;
				switch (logging) {
					default:
						acceptedTypes = new Set();
						break;
					case "error":
						acceptedTypes = new Set([LogType.error]);
						break;
					case "warn":
						acceptedTypes = new Set([LogType.error, LogType.warn]);
						break;
					case "info":
						acceptedTypes = new Set([
							LogType.error,
							LogType.warn,
							LogType.info
						]);
						break;
					case "log":
						acceptedTypes = new Set([
							LogType.error,
							LogType.warn,
							LogType.info,
							LogType.log,
							LogType.group,
							LogType.groupEnd,
							LogType.groupCollapsed,
							LogType.clear
						]);
						break;
					case "verbose":
						acceptedTypes = new Set([
							LogType.error,
							LogType.warn,
							LogType.info,
							LogType.log,
							LogType.group,
							LogType.groupEnd,
							LogType.groupCollapsed,
							LogType.profile,
							LogType.profileEnd,
							LogType.time,
							LogType.status,
							LogType.clear
						]);
						collapsedGroups = true;
						break;
				}
				const cachedMakePathsRelative = makePathsRelative.bindContextCache(
					options.context,
					compilation.compiler.root
				);
				let depthInCollapsedGroup = 0;
				for (const [origin, logEntries] of compilation.logging) {
					const debugMode = loggingDebug.some(fn => fn(origin));
					if (logging === false && !debugMode) continue;
					/** @type {KnownStatsLoggingEntry[]} */
					const groupStack = [];
					/** @type {KnownStatsLoggingEntry[]} */
					const rootList = [];
					let currentList = rootList;
					let processedLogEntries = 0;
					for (const entry of logEntries) {
						let type = entry.type;
						if (!debugMode && !acceptedTypes.has(type)) continue;

						// Expand groups in verbose and debug modes
						if (
							type === LogType.groupCollapsed &&
							(debugMode || collapsedGroups)
						)
							type = LogType.group;

						if (depthInCollapsedGroup === 0) {
							processedLogEntries++;
						}

						if (type === LogType.groupEnd) {
							groupStack.pop();
							if (groupStack.length > 0) {
								currentList = groupStack[groupStack.length - 1].children;
							} else {
								currentList = rootList;
							}
							if (depthInCollapsedGroup > 0) depthInCollapsedGroup--;
							continue;
						}
						let message = undefined;
						if (entry.type === LogType.time) {
							message = `${entry.args[0]}: ${
								entry.args[1] * 1000 + entry.args[2] / 1000000
							} ms`;
						} else if (entry.args && entry.args.length > 0) {
							message = util.format(entry.args[0], ...entry.args.slice(1));
						}
						/** @type {KnownStatsLoggingEntry} */
						const newEntry = {
							...entry,
							type,
							message,
							trace: loggingTrace ? entry.trace : undefined,
							children:
								type === LogType.group || type === LogType.groupCollapsed
									? []
									: undefined
						};
						currentList.push(newEntry);
						if (newEntry.children) {
							groupStack.push(newEntry);
							currentList = newEntry.children;
							if (depthInCollapsedGroup > 0) {
								depthInCollapsedGroup++;
							} else if (type === LogType.groupCollapsed) {
								depthInCollapsedGroup = 1;
							}
						}
					}
					let name = cachedMakePathsRelative(origin).replace(/\|/g, " ");
					if (name in object.logging) {
						let i = 1;
						while (`${name}#${i}` in object.logging) {
							i++;
						}
						name = `${name}#${i}`;
					}
					object.logging[name] = {
						entries: rootList,
						filteredEntries: logEntries.length - processedLogEntries,
						debug: debugMode
					};
				}
			}
		},
		hash: (object, compilation) => {
			object.hash = compilation.hash;
		},
		version: object => {
			object.version = require("../../package.json").version;
		},
		env: (object, compilation, context, { _env }) => {
			object.env = _env;
		},
		timings: (object, compilation) => {
			object.time = compilation.endTime - compilation.startTime;
		},
		builtAt: (object, compilation) => {
			object.builtAt = compilation.endTime;
		},
		publicPath: (object, compilation) => {
			object.publicPath = compilation.getPath(
				compilation.outputOptions.publicPath
			);
		},
		outputPath: (object, compilation) => {
			object.outputPath = compilation.outputOptions.path;
		},
		assets: (object, compilation, context, options, factory) => {
			const { type } = context;
			/** @type {Map<string, Chunk[]>} */
			const compilationFileToChunks = new Map();
			/** @type {Map<string, Chunk[]>} */
			const compilationAuxiliaryFileToChunks = new Map();
			for (const chunk of compilation.chunks) {
				for (const file of chunk.files) {
					let array = compilationFileToChunks.get(file);
					if (array === undefined) {
						array = [];
						compilationFileToChunks.set(file, array);
					}
					array.push(chunk);
				}
				for (const file of chunk.auxiliaryFiles) {
					let array = compilationAuxiliaryFileToChunks.get(file);
					if (array === undefined) {
						array = [];
						compilationAuxiliaryFileToChunks.set(file, array);
					}
					array.push(chunk);
				}
			}
			/** @type {Map<string, PreprocessedAsset>} */
			const assetMap = new Map();
			/** @type {Set<PreprocessedAsset>} */
			const assets = new Set();
			for (const asset of compilation.getAssets()) {
				/** @type {PreprocessedAsset} */
				const item = {
					...asset,
					type: "asset",
					related: undefined
				};
				assets.add(item);
				assetMap.set(asset.name, item);
			}
			for (const item of assetMap.values()) {
				const related = item.info.related;
				if (!related) continue;
				for (const type of Object.keys(related)) {
					const relatedEntry = related[type];
					const deps = Array.isArray(relatedEntry)
						? relatedEntry
						: [relatedEntry];
					for (const dep of deps) {
						const depItem = assetMap.get(dep);
						if (!depItem) continue;
						assets.delete(depItem);
						depItem.type = type;
						item.related = item.related || [];
						item.related.push(depItem);
					}
				}
			}

			object.assetsByChunkName = {};
			for (const [file, chunks] of compilationFileToChunks) {
				for (const chunk of chunks) {
					const name = chunk.name;
					if (!name) continue;
					if (
						!Object.prototype.hasOwnProperty.call(
							object.assetsByChunkName,
							name
						)
					) {
						object.assetsByChunkName[name] = [];
					}
					object.assetsByChunkName[name].push(file);
				}
			}

			const groupedAssets = factory.create(
				`${type}.assets`,
				Array.from(assets),
				{
					...context,
					compilationFileToChunks,
					compilationAuxiliaryFileToChunks
				}
			);
			const limited = spaceLimited(groupedAssets, options.assetsSpace);
			object.assets = limited.children;
			object.filteredAssets = limited.filteredChildren;
		},
		chunks: (object, compilation, context, options, factory) => {
			const { type } = context;
			object.chunks = factory.create(
				`${type}.chunks`,
				Array.from(compilation.chunks),
				context
			);
		},
		modules: (object, compilation, context, options, factory) => {
			const { type } = context;
			const array = Array.from(compilation.modules);
			const groupedModules = factory.create(`${type}.modules`, array, context);
			const limited = spaceLimited(groupedModules, options.modulesSpace);
			object.modules = limited.children;
			object.filteredModules = limited.filteredChildren;
		},
		entrypoints: (
			object,
			compilation,
			context,
			{ entrypoints, chunkGroups, chunkGroupAuxiliary, chunkGroupChildren },
			factory
		) => {
			const { type } = context;
			const array = Array.from(compilation.entrypoints, ([key, value]) => ({
				name: key,
				chunkGroup: value
			}));
			if (entrypoints === "auto" && !chunkGroups) {
				if (array.length > 5) return;
				if (
					!chunkGroupChildren &&
					array.every(({ chunkGroup }) => {
						if (chunkGroup.chunks.length !== 1) return false;
						const chunk = chunkGroup.chunks[0];
						return (
							chunk.files.size === 1 &&
							(!chunkGroupAuxiliary || chunk.auxiliaryFiles.size === 0)
						);
					})
				) {
					return;
				}
			}
			object.entrypoints = factory.create(
				`${type}.entrypoints`,
				array,
				context
			);
		},
		chunkGroups: (object, compilation, context, options, factory) => {
			const { type } = context;
			const array = Array.from(
				compilation.namedChunkGroups,
				([key, value]) => ({
					name: key,
					chunkGroup: value
				})
			);
			object.namedChunkGroups = factory.create(
				`${type}.namedChunkGroups`,
				array,
				context
			);
		},
		errors: (object, compilation, context, options, factory) => {
			const { type, cachedGetErrors } = context;
			object.errors = factory.create(
				`${type}.errors`,
				cachedGetErrors(compilation),
				context
			);
		},
		errorsCount: (object, compilation, { cachedGetErrors }) => {
			object.errorsCount = countWithChildren(compilation, c =>
				cachedGetErrors(c)
			);
		},
		warnings: (object, compilation, context, options, factory) => {
			const { type, cachedGetWarnings } = context;
			object.warnings = factory.create(
				`${type}.warnings`,
				cachedGetWarnings(compilation),
				context
			);
		},
		warningsCount: (
			object,
			compilation,
			context,
			{ warningsFilter },
			factory
		) => {
			const { type, cachedGetWarnings } = context;
			object.warningsCount = countWithChildren(compilation, (c, childType) => {
				if (!warningsFilter && warningsFilter.length === 0)
					return cachedGetWarnings(c);
				return factory
					.create(`${type}${childType}.warnings`, cachedGetWarnings(c), context)
					.filter(warning => {
						const warningString = Object.keys(warning)
							.map(key => `${warning[key]}`)
							.join("\n");
						return !warningsFilter.some(filter =>
							filter(warning, warningString)
						);
					});
			});
		},
		errorDetails: (
			object,
			compilation,
			{ cachedGetErrors, cachedGetWarnings },
			{ errorDetails, errors, warnings }
		) => {
			if (errorDetails === "auto") {
				if (warnings) {
					const warnings = cachedGetWarnings(compilation);
					object.filteredWarningDetailsCount = warnings
						.map(e => typeof e !== "string" && e.details)
						.filter(Boolean).length;
				}
				if (errors) {
					const errors = cachedGetErrors(compilation);
					if (errors.length >= 3) {
						object.filteredErrorDetailsCount = errors
							.map(e => typeof e !== "string" && e.details)
							.filter(Boolean).length;
					}
				}
			}
		},
		children: (object, compilation, context, options, factory) => {
			const { type } = context;
			object.children = factory.create(
				`${type}.children`,
				compilation.children,
				context
			);
		}
	},
	asset: {
		_: (object, asset, context, options, factory) => {
			const { compilation } = context;
			object.type = asset.type;
			object.name = asset.name;
			object.size = asset.source.size();
			object.emitted = compilation.emittedAssets.has(asset.name);
			object.comparedForEmit = compilation.comparedForEmitAssets.has(
				asset.name
			);
			const cached = !object.emitted && !object.comparedForEmit;
			object.cached = cached;
			object.info = asset.info;
			if (!cached || options.cachedAssets) {
				Object.assign(
					object,
					factory.create(`${context.type}$visible`, asset, context)
				);
			}
		}
	},
	asset$visible: {
		_: (
			object,
			asset,
			{ compilation, compilationFileToChunks, compilationAuxiliaryFileToChunks }
		) => {
			const chunks = compilationFileToChunks.get(asset.name) || [];
			const auxiliaryChunks =
				compilationAuxiliaryFileToChunks.get(asset.name) || [];
			object.chunkNames = uniqueOrderedArray(
				chunks,
				c => (c.name ? [c.name] : []),
				compareIds
			);
			object.chunkIdHints = uniqueOrderedArray(
				chunks,
				c => Array.from(c.idNameHints),
				compareIds
			);
			object.auxiliaryChunkNames = uniqueOrderedArray(
				auxiliaryChunks,
				c => (c.name ? [c.name] : []),
				compareIds
			);
			object.auxiliaryChunkIdHints = uniqueOrderedArray(
				auxiliaryChunks,
				c => Array.from(c.idNameHints),
				compareIds
			);
			object.filteredRelated = asset.related ? asset.related.length : undefined;
		},
		relatedAssets: (object, asset, context, options, factory) => {
			const { type } = context;
			object.related = factory.create(
				`${type.slice(0, -8)}.related`,
				asset.related,
				context
			);
			object.filteredRelated = asset.related
				? asset.related.length - object.related.length
				: undefined;
		},
		ids: (
			object,
			asset,
			{ compilationFileToChunks, compilationAuxiliaryFileToChunks }
		) => {
			const chunks = compilationFileToChunks.get(asset.name) || [];
			const auxiliaryChunks =
				compilationAuxiliaryFileToChunks.get(asset.name) || [];
			object.chunks = uniqueOrderedArray(chunks, c => c.ids, compareIds);
			object.auxiliaryChunks = uniqueOrderedArray(
				auxiliaryChunks,
				c => c.ids,
				compareIds
			);
		},
		performance: (object, asset) => {
			object.isOverSizeLimit = SizeLimitsPlugin.isOverSizeLimit(asset.source);
		}
	},
	chunkGroup: {
		_: (
			object,
			{ name, chunkGroup },
			{ compilation, compilation: { moduleGraph, chunkGraph } },
			{ ids, chunkGroupAuxiliary, chunkGroupChildren, chunkGroupMaxAssets }
		) => {
			const children =
				chunkGroupChildren &&
				chunkGroup.getChildrenByOrders(moduleGraph, chunkGraph);
			/**
			 * @param {string} name Name
			 * @returns {{ name: string, size: number }} Asset object
			 */
			const toAsset = name => {
				const asset = compilation.getAsset(name);
				return {
					name,
					size: asset ? asset.info.size : -1
				};
			};
			/** @type {(total: number, asset: { size: number }) => number} */
			const sizeReducer = (total, { size }) => total + size;
			const assets = uniqueArray(chunkGroup.chunks, c => c.files).map(toAsset);
			const auxiliaryAssets = uniqueOrderedArray(
				chunkGroup.chunks,
				c => c.auxiliaryFiles,
				compareIds
			).map(toAsset);
			const assetsSize = assets.reduce(sizeReducer, 0);
			const auxiliaryAssetsSize = auxiliaryAssets.reduce(sizeReducer, 0);
			/** @type {KnownStatsChunkGroup} */
			const statsChunkGroup = {
				name,
				chunks: ids ? chunkGroup.chunks.map(c => c.id) : undefined,
				assets: assets.length <= chunkGroupMaxAssets ? assets : undefined,
				filteredAssets:
					assets.length <= chunkGroupMaxAssets ? 0 : assets.length,
				assetsSize,
				auxiliaryAssets:
					chunkGroupAuxiliary && auxiliaryAssets.length <= chunkGroupMaxAssets
						? auxiliaryAssets
						: undefined,
				filteredAuxiliaryAssets:
					chunkGroupAuxiliary && auxiliaryAssets.length <= chunkGroupMaxAssets
						? 0
						: auxiliaryAssets.length,
				auxiliaryAssetsSize,
				children: children
					? mapObject(children, groups =>
							groups.map(group => {
								const assets = uniqueArray(group.chunks, c => c.files).map(
									toAsset
								);
								const auxiliaryAssets = uniqueOrderedArray(
									group.chunks,
									c => c.auxiliaryFiles,
									compareIds
								).map(toAsset);

								/** @type {KnownStatsChunkGroup} */
								const childStatsChunkGroup = {
									name: group.name,
									chunks: ids ? group.chunks.map(c => c.id) : undefined,
									assets:
										assets.length <= chunkGroupMaxAssets ? assets : undefined,
									filteredAssets:
										assets.length <= chunkGroupMaxAssets ? 0 : assets.length,
									auxiliaryAssets:
										chunkGroupAuxiliary &&
										auxiliaryAssets.length <= chunkGroupMaxAssets
											? auxiliaryAssets
											: undefined,
									filteredAuxiliaryAssets:
										chunkGroupAuxiliary &&
										auxiliaryAssets.length <= chunkGroupMaxAssets
											? 0
											: auxiliaryAssets.length
								};

								return childStatsChunkGroup;
							})
					  )
					: undefined,
				childAssets: children
					? mapObject(children, groups => {
							/** @type {Set<string>} */
							const set = new Set();
							for (const group of groups) {
								for (const chunk of group.chunks) {
									for (const asset of chunk.files) {
										set.add(asset);
									}
								}
							}
							return Array.from(set);
					  })
					: undefined
			};
			Object.assign(object, statsChunkGroup);
		},
		performance: (object, { chunkGroup }) => {
			object.isOverSizeLimit = SizeLimitsPlugin.isOverSizeLimit(chunkGroup);
		}
	},
	module: {
		_: (object, module, context, options, factory) => {
			const { compilation, type } = context;
			const built = compilation.builtModules.has(module);
			const codeGenerated = compilation.codeGeneratedModules.has(module);
			const buildTimeExecuted =
				compilation.buildTimeExecutedModules.has(module);
			/** @type {{[x: string]: number}} */
			const sizes = {};
			for (const sourceType of module.getSourceTypes()) {
				sizes[sourceType] = module.size(sourceType);
			}
			/** @type {KnownStatsModule} */
			const statsModule = {
				type: "module",
				moduleType: module.type,
				layer: module.layer,
				size: module.size(),
				sizes,
				built,
				codeGenerated,
				buildTimeExecuted,
				cached: !built && !codeGenerated
			};
			Object.assign(object, statsModule);

			if (built || codeGenerated || options.cachedModules) {
				Object.assign(
					object,
					factory.create(`${type}$visible`, module, context)
				);
			}
		}
	},
	module$visible: {
		_: (object, module, context, { requestShortener }, factory) => {
			const { compilation, type, rootModules } = context;
			const { moduleGraph } = compilation;
			/** @type {Module[]} */
			const path = [];
			const issuer = moduleGraph.getIssuer(module);
			let current = issuer;
			while (current) {
				path.push(current);
				current = moduleGraph.getIssuer(current);
			}
			path.reverse();
			const profile = moduleGraph.getProfile(module);
			const errors = module.getErrors();
			const errorsCount = errors !== undefined ? countIterable(errors) : 0;
			const warnings = module.getWarnings();
			const warningsCount =
				warnings !== undefined ? countIterable(warnings) : 0;
			/** @type {{[x: string]: number}} */
			const sizes = {};
			for (const sourceType of module.getSourceTypes()) {
				sizes[sourceType] = module.size(sourceType);
			}
			/** @type {KnownStatsModule} */
			const statsModule = {
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener),
				nameForCondition: module.nameForCondition(),
				index: moduleGraph.getPreOrderIndex(module),
				preOrderIndex: moduleGraph.getPreOrderIndex(module),
				index2: moduleGraph.getPostOrderIndex(module),
				postOrderIndex: moduleGraph.getPostOrderIndex(module),
				cacheable: module.buildInfo.cacheable,
				optional: module.isOptional(moduleGraph),
				orphan:
					!type.endsWith("module.modules[].module$visible") &&
					compilation.chunkGraph.getNumberOfModuleChunks(module) === 0,
				dependent: rootModules ? !rootModules.has(module) : undefined,
				issuer: issuer && issuer.identifier(),
				issuerName: issuer && issuer.readableIdentifier(requestShortener),
				issuerPath:
					issuer &&
					factory.create(`${type.slice(0, -8)}.issuerPath`, path, context),
				failed: errorsCount > 0,
				errors: errorsCount,
				warnings: warningsCount
			};
			Object.assign(object, statsModule);
			if (profile) {
				object.profile = factory.create(
					`${type.slice(0, -8)}.profile`,
					profile,
					context
				);
			}
		},
		ids: (object, module, { compilation: { chunkGraph, moduleGraph } }) => {
			object.id = chunkGraph.getModuleId(module);
			const issuer = moduleGraph.getIssuer(module);
			object.issuerId = issuer && chunkGraph.getModuleId(issuer);
			object.chunks = Array.from(
				chunkGraph.getOrderedModuleChunksIterable(module, compareChunksById),
				chunk => chunk.id
			);
		},
		moduleAssets: (object, module) => {
			object.assets = module.buildInfo.assets
				? Object.keys(module.buildInfo.assets)
				: [];
		},
		reasons: (object, module, context, options, factory) => {
			const {
				type,
				compilation: { moduleGraph }
			} = context;
			const groupsReasons = factory.create(
				`${type.slice(0, -8)}.reasons`,
				Array.from(moduleGraph.getIncomingConnections(module)),
				context
			);
			const limited = spaceLimited(groupsReasons, options.reasonsSpace);
			object.reasons = limited.children;
			object.filteredReasons = limited.filteredChildren;
		},
		usedExports: (
			object,
			module,
			{ runtime, compilation: { moduleGraph } }
		) => {
			const usedExports = moduleGraph.getUsedExports(module, runtime);
			if (usedExports === null) {
				object.usedExports = null;
			} else if (typeof usedExports === "boolean") {
				object.usedExports = usedExports;
			} else {
				object.usedExports = Array.from(usedExports);
			}
		},
		providedExports: (object, module, { compilation: { moduleGraph } }) => {
			const providedExports = moduleGraph.getProvidedExports(module);
			object.providedExports = Array.isArray(providedExports)
				? providedExports
				: null;
		},
		optimizationBailout: (
			object,
			module,
			{ compilation: { moduleGraph } },
			{ requestShortener }
		) => {
			object.optimizationBailout = moduleGraph
				.getOptimizationBailout(module)
				.map(item => {
					if (typeof item === "function") return item(requestShortener);
					return item;
				});
		},
		depth: (object, module, { compilation: { moduleGraph } }) => {
			object.depth = moduleGraph.getDepth(module);
		},
		nestedModules: (object, module, context, options, factory) => {
			const { type } = context;
			const innerModules = /** @type {Module & { modules?: Module[] }} */ (
				module
			).modules;
			if (Array.isArray(innerModules)) {
				const groupedModules = factory.create(
					`${type.slice(0, -8)}.modules`,
					innerModules,
					context
				);
				const limited = spaceLimited(
					groupedModules,
					options.nestedModulesSpace
				);
				object.modules = limited.children;
				object.filteredModules = limited.filteredChildren;
			}
		},
		source: (object, module) => {
			const originalSource = module.originalSource();
			if (originalSource) {
				object.source = originalSource.source();
			}
		}
	},
	profile: {
		_: (object, profile) => {
			/** @type {KnownStatsProfile} */
			const statsProfile = {
				total:
					profile.factory +
					profile.restoring +
					profile.integration +
					profile.building +
					profile.storing,
				resolving: profile.factory,
				restoring: profile.restoring,
				building: profile.building,
				integration: profile.integration,
				storing: profile.storing,
				additionalResolving: profile.additionalFactories,
				additionalIntegration: profile.additionalIntegration,
				// TODO remove this in webpack 6
				factory: profile.factory,
				// TODO remove this in webpack 6
				dependencies: profile.additionalFactories
			};
			Object.assign(object, statsProfile);
		}
	},
	moduleIssuer: {
		_: (object, module, context, { requestShortener }, factory) => {
			const { compilation, type } = context;
			const { moduleGraph } = compilation;
			const profile = moduleGraph.getProfile(module);
			/** @type {KnownStatsModuleIssuer} */
			const statsModuleIssuer = {
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener)
			};
			Object.assign(object, statsModuleIssuer);
			if (profile) {
				object.profile = factory.create(`${type}.profile`, profile, context);
			}
		},
		ids: (object, module, { compilation: { chunkGraph } }) => {
			object.id = chunkGraph.getModuleId(module);
		}
	},
	moduleReason: {
		_: (object, reason, { runtime }, { requestShortener }) => {
			const dep = reason.dependency;
			const moduleDep =
				dep && dep instanceof ModuleDependency ? dep : undefined;
			/** @type {KnownStatsModuleReason} */
			const statsModuleReason = {
				moduleIdentifier: reason.originModule
					? reason.originModule.identifier()
					: null,
				module: reason.originModule
					? reason.originModule.readableIdentifier(requestShortener)
					: null,
				moduleName: reason.originModule
					? reason.originModule.readableIdentifier(requestShortener)
					: null,
				resolvedModuleIdentifier: reason.resolvedOriginModule
					? reason.resolvedOriginModule.identifier()
					: null,
				resolvedModule: reason.resolvedOriginModule
					? reason.resolvedOriginModule.readableIdentifier(requestShortener)
					: null,
				type: reason.dependency ? reason.dependency.type : null,
				active: reason.isActive(runtime),
				explanation: reason.explanation,
				userRequest: (moduleDep && moduleDep.userRequest) || null
			};
			Object.assign(object, statsModuleReason);
			if (reason.dependency) {
				const locInfo = formatLocation(reason.dependency.loc);
				if (locInfo) {
					object.loc = locInfo;
				}
			}
		},
		ids: (object, reason, { compilation: { chunkGraph } }) => {
			object.moduleId = reason.originModule
				? chunkGraph.getModuleId(reason.originModule)
				: null;
			object.resolvedModuleId = reason.resolvedOriginModule
				? chunkGraph.getModuleId(reason.resolvedOriginModule)
				: null;
		}
	},
	chunk: {
		_: (object, chunk, { makePathsRelative, compilation: { chunkGraph } }) => {
			const childIdByOrder = chunk.getChildIdsByOrders(chunkGraph);

			/** @type {KnownStatsChunk} */
			const statsChunk = {
				rendered: chunk.rendered,
				initial: chunk.canBeInitial(),
				entry: chunk.hasRuntime(),
				recorded: AggressiveSplittingPlugin.wasChunkRecorded(chunk),
				reason: chunk.chunkReason,
				size: chunkGraph.getChunkModulesSize(chunk),
				sizes: chunkGraph.getChunkModulesSizes(chunk),
				names: chunk.name ? [chunk.name] : [],
				idHints: Array.from(chunk.idNameHints),
				runtime:
					chunk.runtime === undefined
						? undefined
						: typeof chunk.runtime === "string"
						? [makePathsRelative(chunk.runtime)]
						: Array.from(chunk.runtime.sort(), makePathsRelative),
				files: Array.from(chunk.files),
				auxiliaryFiles: Array.from(chunk.auxiliaryFiles).sort(compareIds),
				hash: chunk.renderedHash,
				childrenByOrder: childIdByOrder
			};
			Object.assign(object, statsChunk);
		},
		ids: (object, chunk) => {
			object.id = chunk.id;
		},
		chunkRelations: (object, chunk, { compilation: { chunkGraph } }) => {
			/** @type {Set<string|number>} */
			const parents = new Set();
			/** @type {Set<string|number>} */
			const children = new Set();
			/** @type {Set<string|number>} */
			const siblings = new Set();

			for (const chunkGroup of chunk.groupsIterable) {
				for (const parentGroup of chunkGroup.parentsIterable) {
					for (const chunk of parentGroup.chunks) {
						parents.add(chunk.id);
					}
				}
				for (const childGroup of chunkGroup.childrenIterable) {
					for (const chunk of childGroup.chunks) {
						children.add(chunk.id);
					}
				}
				for (const sibling of chunkGroup.chunks) {
					if (sibling !== chunk) siblings.add(sibling.id);
				}
			}
			object.siblings = Array.from(siblings).sort(compareIds);
			object.parents = Array.from(parents).sort(compareIds);
			object.children = Array.from(children).sort(compareIds);
		},
		chunkModules: (object, chunk, context, options, factory) => {
			const {
				type,
				compilation: { chunkGraph }
			} = context;
			const array = chunkGraph.getChunkModules(chunk);
			const groupedModules = factory.create(`${type}.modules`, array, {
				...context,
				runtime: chunk.runtime,
				rootModules: new Set(chunkGraph.getChunkRootModules(chunk))
			});
			const limited = spaceLimited(groupedModules, options.chunkModulesSpace);
			object.modules = limited.children;
			object.filteredModules = limited.filteredChildren;
		},
		chunkOrigins: (object, chunk, context, options, factory) => {
			const {
				type,
				compilation: { chunkGraph }
			} = context;
			/** @type {Set<string>} */
			const originsKeySet = new Set();
			const origins = [];
			for (const g of chunk.groupsIterable) {
				origins.push(...g.origins);
			}
			const array = origins.filter(origin => {
				const key = [
					origin.module ? chunkGraph.getModuleId(origin.module) : undefined,
					formatLocation(origin.loc),
					origin.request
				].join();
				if (originsKeySet.has(key)) return false;
				originsKeySet.add(key);
				return true;
			});
			object.origins = factory.create(`${type}.origins`, array, context);
		}
	},
	chunkOrigin: {
		_: (object, origin, context, { requestShortener }) => {
			/** @type {KnownStatsChunkOrigin} */
			const statsChunkOrigin = {
				module: origin.module ? origin.module.identifier() : "",
				moduleIdentifier: origin.module ? origin.module.identifier() : "",
				moduleName: origin.module
					? origin.module.readableIdentifier(requestShortener)
					: "",
				loc: formatLocation(origin.loc),
				request: origin.request
			};
			Object.assign(object, statsChunkOrigin);
		},
		ids: (object, origin, { compilation: { chunkGraph } }) => {
			object.moduleId = origin.module
				? chunkGraph.getModuleId(origin.module)
				: undefined;
		}
	},
	error: EXTRACT_ERROR,
	warning: EXTRACT_ERROR,
	moduleTraceItem: {
		_: (object, { origin, module }, context, { requestShortener }, factory) => {
			const {
				type,
				compilation: { moduleGraph }
			} = context;
			object.originIdentifier = origin.identifier();
			object.originName = origin.readableIdentifier(requestShortener);
			object.moduleIdentifier = module.identifier();
			object.moduleName = module.readableIdentifier(requestShortener);
			const dependencies = Array.from(
				moduleGraph.getIncomingConnections(module)
			)
				.filter(c => c.resolvedOriginModule === origin && c.dependency)
				.map(c => c.dependency);
			object.dependencies = factory.create(
				`${type}.dependencies`,
				Array.from(new Set(dependencies)),
				context
			);
		},
		ids: (object, { origin, module }, { compilation: { chunkGraph } }) => {
			object.originId = chunkGraph.getModuleId(origin);
			object.moduleId = chunkGraph.getModuleId(module);
		}
	},
	moduleTraceDependency: {
		_: (object, dependency) => {
			object.loc = formatLocation(dependency.loc);
		}
	}
};

/** @type {Record<string, Record<string, (thing: any, context: StatsFactoryContext, options: NormalizedStatsOptions) => boolean | undefined>>} */
const FILTER = {
	"module.reasons": {
		"!orphanModules": (reason, { compilation: { chunkGraph } }) => {
			if (
				reason.originModule &&
				chunkGraph.getNumberOfModuleChunks(reason.originModule) === 0
			) {
				return false;
			}
		}
	}
};

/** @type {Record<string, Record<string, (thing: Object, context: StatsFactoryContext, options: NormalizedStatsOptions) => boolean | undefined>>} */
const FILTER_RESULTS = {
	"compilation.warnings": {
		warningsFilter: util.deprecate(
			(warning, context, { warningsFilter }) => {
				const warningString = Object.keys(warning)
					.map(key => `${warning[key]}`)
					.join("\n");
				return !warningsFilter.some(filter => filter(warning, warningString));
			},
			"config.stats.warningsFilter is deprecated in favor of config.ignoreWarnings",
			"DEP_WEBPACK_STATS_WARNINGS_FILTER"
		)
	}
};

/** @type {Record<string, (comparators: Function[], context: StatsFactoryContext) => void>} */
const MODULES_SORTER = {
	_: (comparators, { compilation: { moduleGraph } }) => {
		comparators.push(
			compareSelect(
				/**
				 * @param {Module} m module
				 * @returns {number} depth
				 */
				m => moduleGraph.getDepth(m),
				compareNumbers
			),
			compareSelect(
				/**
				 * @param {Module} m module
				 * @returns {number} index
				 */
				m => moduleGraph.getPreOrderIndex(m),
				compareNumbers
			),
			compareSelect(
				/**
				 * @param {Module} m module
				 * @returns {string} identifier
				 */
				m => m.identifier(),
				compareIds
			)
		);
	}
};

/** @type {Record<string, Record<string, (comparators: Function[], context: StatsFactoryContext) => void>>} */
const SORTERS = {
	"compilation.chunks": {
		_: comparators => {
			comparators.push(compareSelect(c => c.id, compareIds));
		}
	},
	"compilation.modules": MODULES_SORTER,
	"chunk.rootModules": MODULES_SORTER,
	"chunk.modules": MODULES_SORTER,
	"module.modules": MODULES_SORTER,
	"module.reasons": {
		_: (comparators, { compilation: { chunkGraph } }) => {
			comparators.push(
				compareSelect(x => x.originModule, compareModulesByIdentifier)
			);
			comparators.push(
				compareSelect(x => x.resolvedOriginModule, compareModulesByIdentifier)
			);
			comparators.push(
				compareSelect(
					x => x.dependency,
					concatComparators(
						compareSelect(
							/**
							 * @param {Dependency} x dependency
							 * @returns {DependencyLocation} location
							 */
							x => x.loc,
							compareLocations
						),
						compareSelect(x => x.type, compareIds)
					)
				)
			);
		}
	},
	"chunk.origins": {
		_: (comparators, { compilation: { chunkGraph } }) => {
			comparators.push(
				compareSelect(
					origin =>
						origin.module ? chunkGraph.getModuleId(origin.module) : undefined,
					compareIds
				),
				compareSelect(origin => formatLocation(origin.loc), compareIds),
				compareSelect(origin => origin.request, compareIds)
			);
		}
	}
};

const getItemSize = item => {
	// Each item takes 1 line
	// + the size of the children
	// + 1 extra line when it has children and filteredChildren
	return !item.children
		? 1
		: item.filteredChildren
		? 2 + getTotalSize(item.children)
		: 1 + getTotalSize(item.children);
};

const getTotalSize = children => {
	let size = 0;
	for (const child of children) {
		size += getItemSize(child);
	}
	return size;
};

const getTotalItems = children => {
	let count = 0;
	for (const child of children) {
		if (!child.children && !child.filteredChildren) {
			count++;
		} else {
			if (child.children) count += getTotalItems(child.children);
			if (child.filteredChildren) count += child.filteredChildren;
		}
	}
	return count;
};

const collapse = children => {
	// After collapse each child must take exactly one line
	const newChildren = [];
	for (const child of children) {
		if (child.children) {
			let filteredChildren = child.filteredChildren || 0;
			filteredChildren += getTotalItems(child.children);
			newChildren.push({
				...child,
				children: undefined,
				filteredChildren
			});
		} else {
			newChildren.push(child);
		}
	}
	return newChildren;
};

const spaceLimited = (
	itemsAndGroups,
	max,
	filteredChildrenLineReserved = false
) => {
	if (max < 1) {
		return {
			children: undefined,
			filteredChildren: getTotalItems(itemsAndGroups)
		};
	}
	/** @type {any[] | undefined} */
	let children = undefined;
	/** @type {number | undefined} */
	let filteredChildren = undefined;
	// This are the groups, which take 1+ lines each
	const groups = [];
	// The sizes of the groups are stored in groupSizes
	const groupSizes = [];
	// This are the items, which take 1 line each
	const items = [];
	// The total of group sizes
	let groupsSize = 0;

	for (const itemOrGroup of itemsAndGroups) {
		// is item
		if (!itemOrGroup.children && !itemOrGroup.filteredChildren) {
			items.push(itemOrGroup);
		} else {
			groups.push(itemOrGroup);
			const size = getItemSize(itemOrGroup);
			groupSizes.push(size);
			groupsSize += size;
		}
	}

	if (groupsSize + items.length <= max) {
		// The total size in the current state fits into the max
		// keep all
		children = groups.length > 0 ? groups.concat(items) : items;
	} else if (groups.length === 0) {
		// slice items to max
		// inner space marks that lines for filteredChildren already reserved
		const limit = max - (filteredChildrenLineReserved ? 0 : 1);
		filteredChildren = items.length - limit;
		items.length = limit;
		children = items;
	} else {
		// limit is the size when all groups are collapsed
		const limit =
			groups.length +
			(filteredChildrenLineReserved || items.length === 0 ? 0 : 1);
		if (limit < max) {
			// calculate how much we are over the size limit
			// this allows to approach the limit faster
			let oversize;
			// If each group would take 1 line the total would be below the maximum
			// collapse some groups, keep items
			while (
				(oversize =
					groupsSize +
					items.length +
					(filteredChildren && !filteredChildrenLineReserved ? 1 : 0) -
					max) > 0
			) {
				// Find the maximum group and process only this one
				const maxGroupSize = Math.max(...groupSizes);
				if (maxGroupSize < items.length) {
					filteredChildren = items.length;
					items.length = 0;
					continue;
				}
				for (let i = 0; i < groups.length; i++) {
					if (groupSizes[i] === maxGroupSize) {
						const group = groups[i];
						// run this algorithm recursively and limit the size of the children to
						// current size - oversize / number of groups
						// So it should always end up being smaller
						const headerSize = group.filteredChildren ? 2 : 1;
						const limited = spaceLimited(
							group.children,
							maxGroupSize -
								// we should use ceil to always feet in max
								Math.ceil(oversize / groups.length) -
								// we substitute size of group head
								headerSize,
							headerSize === 2
						);
						groups[i] = {
							...group,
							children: limited.children,
							filteredChildren: limited.filteredChildren
								? (group.filteredChildren || 0) + limited.filteredChildren
								: group.filteredChildren
						};
						const newSize = getItemSize(groups[i]);
						groupsSize -= maxGroupSize - newSize;
						groupSizes[i] = newSize;
						break;
					}
				}
			}
			children = groups.concat(items);
		} else if (limit === max) {
			// If we have only enough space to show one line per group and one line for the filtered items
			// collapse all groups and items
			children = collapse(groups);
			filteredChildren = items.length;
		} else {
			// If we have no space
			// collapse complete group
			filteredChildren = getTotalItems(itemsAndGroups);
		}
	}

	return {
		children,
		filteredChildren
	};
};

const assetGroup = (children, assets) => {
	let size = 0;
	for (const asset of children) {
		size += asset.size;
	}
	return {
		size
	};
};

const moduleGroup = (children, modules) => {
	let size = 0;
	const sizes = {};
	for (const module of children) {
		size += module.size;
		for (const key of Object.keys(module.sizes)) {
			sizes[key] = (sizes[key] || 0) + module.sizes[key];
		}
	}
	return {
		size,
		sizes
	};
};

const reasonGroup = (children, reasons) => {
	let active = false;
	for (const reason of children) {
		active = active || reason.active;
	}
	return {
		active
	};
};

const GROUP_EXTENSION_REGEXP = /(\.[^.]+?)(?:\?|(?: \+ \d+ modules?)?$)/;
const GROUP_PATH_REGEXP = /(.+)[/\\][^/\\]+?(?:\?|(?: \+ \d+ modules?)?$)/;

/** @type {Record<string, (groupConfigs: GroupConfig[], context: StatsFactoryContext, options: NormalizedStatsOptions) => void>} */
const ASSETS_GROUPERS = {
	_: (groupConfigs, context, options) => {
		const groupByFlag = (name, exclude) => {
			groupConfigs.push({
				getKeys: asset => {
					return asset[name] ? ["1"] : undefined;
				},
				getOptions: () => {
					return {
						groupChildren: !exclude,
						force: exclude
					};
				},
				createGroup: (key, children, assets) => {
					return exclude
						? {
								type: "assets by status",
								[name]: !!key,
								filteredChildren: assets.length,
								...assetGroup(children, assets)
						  }
						: {
								type: "assets by status",
								[name]: !!key,
								children,
								...assetGroup(children, assets)
						  };
				}
			});
		};
		const {
			groupAssetsByEmitStatus,
			groupAssetsByPath,
			groupAssetsByExtension
		} = options;
		if (groupAssetsByEmitStatus) {
			groupByFlag("emitted");
			groupByFlag("comparedForEmit");
			groupByFlag("isOverSizeLimit");
		}
		if (groupAssetsByEmitStatus || !options.cachedAssets) {
			groupByFlag("cached", !options.cachedAssets);
		}
		if (groupAssetsByPath || groupAssetsByExtension) {
			groupConfigs.push({
				getKeys: asset => {
					const extensionMatch =
						groupAssetsByExtension && GROUP_EXTENSION_REGEXP.exec(asset.name);
					const extension = extensionMatch ? extensionMatch[1] : "";
					const pathMatch =
						groupAssetsByPath && GROUP_PATH_REGEXP.exec(asset.name);
					const path = pathMatch ? pathMatch[1].split(/[/\\]/) : [];
					const keys = [];
					if (groupAssetsByPath) {
						keys.push(".");
						if (extension)
							keys.push(
								path.length
									? `${path.join("/")}/*${extension}`
									: `*${extension}`
							);
						while (path.length > 0) {
							keys.push(path.join("/") + "/");
							path.pop();
						}
					} else {
						if (extension) keys.push(`*${extension}`);
					}
					return keys;
				},
				createGroup: (key, children, assets) => {
					return {
						type: groupAssetsByPath ? "assets by path" : "assets by extension",
						name: key,
						children,
						...assetGroup(children, assets)
					};
				}
			});
		}
	},
	groupAssetsByInfo: (groupConfigs, context, options) => {
		const groupByAssetInfoFlag = name => {
			groupConfigs.push({
				getKeys: asset => {
					return asset.info && asset.info[name] ? ["1"] : undefined;
				},
				createGroup: (key, children, assets) => {
					return {
						type: "assets by info",
						info: {
							[name]: !!key
						},
						children,
						...assetGroup(children, assets)
					};
				}
			});
		};
		groupByAssetInfoFlag("immutable");
		groupByAssetInfoFlag("development");
		groupByAssetInfoFlag("hotModuleReplacement");
	},
	groupAssetsByChunk: (groupConfigs, context, options) => {
		const groupByNames = name => {
			groupConfigs.push({
				getKeys: asset => {
					return asset[name];
				},
				createGroup: (key, children, assets) => {
					return {
						type: "assets by chunk",
						[name]: [key],
						children,
						...assetGroup(children, assets)
					};
				}
			});
		};
		groupByNames("chunkNames");
		groupByNames("auxiliaryChunkNames");
		groupByNames("chunkIdHints");
		groupByNames("auxiliaryChunkIdHints");
	},
	excludeAssets: (groupConfigs, context, { excludeAssets }) => {
		groupConfigs.push({
			getKeys: asset => {
				const ident = asset.name;
				const excluded = excludeAssets.some(fn => fn(ident, asset));
				if (excluded) return ["excluded"];
			},
			getOptions: () => ({
				groupChildren: false,
				force: true
			}),
			createGroup: (key, children, assets) => ({
				type: "hidden assets",
				filteredChildren: assets.length,
				...assetGroup(children, assets)
			})
		});
	}
};

/** @type {function("module" | "chunk" | "root-of-chunk" | "nested"): Record<string, (groupConfigs: GroupConfig[], context: StatsFactoryContext, options: NormalizedStatsOptions) => void>} */
const MODULES_GROUPERS = type => ({
	_: (groupConfigs, context, options) => {
		const groupByFlag = (name, type, exclude) => {
			groupConfigs.push({
				getKeys: module => {
					return module[name] ? ["1"] : undefined;
				},
				getOptions: () => {
					return {
						groupChildren: !exclude,
						force: exclude
					};
				},
				createGroup: (key, children, modules) => {
					return {
						type,
						[name]: !!key,
						...(exclude ? { filteredChildren: modules.length } : { children }),
						...moduleGroup(children, modules)
					};
				}
			});
		};
		const {
			groupModulesByCacheStatus,
			groupModulesByLayer,
			groupModulesByAttributes,
			groupModulesByType,
			groupModulesByPath,
			groupModulesByExtension
		} = options;
		if (groupModulesByAttributes) {
			groupByFlag("errors", "modules with errors");
			groupByFlag("warnings", "modules with warnings");
			groupByFlag("assets", "modules with assets");
			groupByFlag("optional", "optional modules");
		}
		if (groupModulesByCacheStatus) {
			groupByFlag("cacheable", "cacheable modules");
			groupByFlag("built", "built modules");
			groupByFlag("codeGenerated", "code generated modules");
		}
		if (groupModulesByCacheStatus || !options.cachedModules) {
			groupByFlag("cached", "cached modules", !options.cachedModules);
		}
		if (groupModulesByAttributes || !options.orphanModules) {
			groupByFlag("orphan", "orphan modules", !options.orphanModules);
		}
		if (groupModulesByAttributes || !options.dependentModules) {
			groupByFlag("dependent", "dependent modules", !options.dependentModules);
		}
		if (groupModulesByType || !options.runtimeModules) {
			groupConfigs.push({
				getKeys: module => {
					if (!module.moduleType) return;
					if (groupModulesByType) {
						return [module.moduleType.split("/", 1)[0]];
					} else if (module.moduleType === "runtime") {
						return ["runtime"];
					}
				},
				getOptions: key => {
					const exclude = key === "runtime" && !options.runtimeModules;
					return {
						groupChildren: !exclude,
						force: exclude
					};
				},
				createGroup: (key, children, modules) => {
					const exclude = key === "runtime" && !options.runtimeModules;
					return {
						type: `${key} modules`,
						moduleType: key,
						...(exclude ? { filteredChildren: modules.length } : { children }),
						...moduleGroup(children, modules)
					};
				}
			});
		}
		if (groupModulesByLayer) {
			groupConfigs.push({
				getKeys: module => {
					return [module.layer];
				},
				createGroup: (key, children, modules) => {
					return {
						type: "modules by layer",
						layer: key,
						children,
						...moduleGroup(children, modules)
					};
				}
			});
		}
		if (groupModulesByPath || groupModulesByExtension) {
			groupConfigs.push({
				getKeys: module => {
					if (!module.name) return;
					const resource = parseResource(module.name.split("!").pop()).path;
					const dataUrl = /^data:[^,;]+/.exec(resource);
					if (dataUrl) return [dataUrl[0]];
					const extensionMatch =
						groupModulesByExtension && GROUP_EXTENSION_REGEXP.exec(resource);
					const extension = extensionMatch ? extensionMatch[1] : "";
					const pathMatch =
						groupModulesByPath && GROUP_PATH_REGEXP.exec(resource);
					const path = pathMatch ? pathMatch[1].split(/[/\\]/) : [];
					const keys = [];
					if (groupModulesByPath) {
						if (extension)
							keys.push(
								path.length
									? `${path.join("/")}/*${extension}`
									: `*${extension}`
							);
						while (path.length > 0) {
							keys.push(path.join("/") + "/");
							path.pop();
						}
					} else {
						if (extension) keys.push(`*${extension}`);
					}
					return keys;
				},
				createGroup: (key, children, modules) => {
					const isDataUrl = key.startsWith("data:");
					return {
						type: isDataUrl
							? "modules by mime type"
							: groupModulesByPath
							? "modules by path"
							: "modules by extension",
						name: isDataUrl ? key.slice(/* 'data:'.length */ 5) : key,
						children,
						...moduleGroup(children, modules)
					};
				}
			});
		}
	},
	excludeModules: (groupConfigs, context, { excludeModules }) => {
		groupConfigs.push({
			getKeys: module => {
				const name = module.name;
				if (name) {
					const excluded = excludeModules.some(fn => fn(name, module, type));
					if (excluded) return ["1"];
				}
			},
			getOptions: () => ({
				groupChildren: false,
				force: true
			}),
			createGroup: (key, children, modules) => ({
				type: "hidden modules",
				filteredChildren: children.length,
				...moduleGroup(children, modules)
			})
		});
	}
});

/** @type {Record<string, Record<string, (groupConfigs: GroupConfig[], context: StatsFactoryContext, options: NormalizedStatsOptions) => void>>} */
const RESULT_GROUPERS = {
	"compilation.assets": ASSETS_GROUPERS,
	"asset.related": ASSETS_GROUPERS,
	"compilation.modules": MODULES_GROUPERS("module"),
	"chunk.modules": MODULES_GROUPERS("chunk"),
	"chunk.rootModules": MODULES_GROUPERS("root-of-chunk"),
	"module.modules": MODULES_GROUPERS("nested"),
	"module.reasons": {
		groupReasonsByOrigin: groupConfigs => {
			groupConfigs.push({
				getKeys: reason => {
					return [reason.module];
				},
				createGroup: (key, children, reasons) => {
					return {
						type: "from origin",
						module: key,
						children,
						...reasonGroup(children, reasons)
					};
				}
			});
		}
	}
};

// remove a prefixed "!" that can be specified to reverse sort order
const normalizeFieldKey = field => {
	if (field[0] === "!") {
		return field.slice(1);
	}
	return field;
};

// if a field is prefixed by a "!" reverse sort order
const sortOrderRegular = field => {
	if (field[0] === "!") {
		return false;
	}
	return true;
};

/**
 * @param {string} field field name
 * @returns {function(Object, Object): number} comparators
 */
const sortByField = field => {
	if (!field) {
		/**
		 * @param {any} a first
		 * @param {any} b second
		 * @returns {-1|0|1} zero
		 */
		const noSort = (a, b) => 0;
		return noSort;
	}

	const fieldKey = normalizeFieldKey(field);

	let sortFn = compareSelect(m => m[fieldKey], compareIds);

	// if a field is prefixed with a "!" the sort is reversed!
	const sortIsRegular = sortOrderRegular(field);

	if (!sortIsRegular) {
		const oldSortFn = sortFn;
		sortFn = (a, b) => oldSortFn(b, a);
	}

	return sortFn;
};

const ASSET_SORTERS = {
	/** @type {(comparators: Function[], context: StatsFactoryContext, options: NormalizedStatsOptions) => void} */
	assetsSort: (comparators, context, { assetsSort }) => {
		comparators.push(sortByField(assetsSort));
	},
	_: comparators => {
		comparators.push(compareSelect(a => a.name, compareIds));
	}
};

/** @type {Record<string, Record<string, (comparators: Function[], context: StatsFactoryContext, options: NormalizedStatsOptions) => void>>} */
const RESULT_SORTERS = {
	"compilation.chunks": {
		chunksSort: (comparators, context, { chunksSort }) => {
			comparators.push(sortByField(chunksSort));
		}
	},
	"compilation.modules": {
		modulesSort: (comparators, context, { modulesSort }) => {
			comparators.push(sortByField(modulesSort));
		}
	},
	"chunk.modules": {
		chunkModulesSort: (comparators, context, { chunkModulesSort }) => {
			comparators.push(sortByField(chunkModulesSort));
		}
	},
	"module.modules": {
		nestedModulesSort: (comparators, context, { nestedModulesSort }) => {
			comparators.push(sortByField(nestedModulesSort));
		}
	},
	"compilation.assets": ASSET_SORTERS,
	"asset.related": ASSET_SORTERS
};

/**
 * @param {Record<string, Record<string, Function>>} config the config see above
 * @param {NormalizedStatsOptions} options stats options
 * @param {function(string, Function): void} fn handler function called for every active line in config
 * @returns {void}
 */
const iterateConfig = (config, options, fn) => {
	for (const hookFor of Object.keys(config)) {
		const subConfig = config[hookFor];
		for (const option of Object.keys(subConfig)) {
			if (option !== "_") {
				if (option.startsWith("!")) {
					if (options[option.slice(1)]) continue;
				} else {
					const value = options[option];
					if (
						value === false ||
						value === undefined ||
						(Array.isArray(value) && value.length === 0)
					)
						continue;
				}
			}
			fn(hookFor, subConfig[option]);
		}
	}
};

/** @type {Record<string, string>} */
const ITEM_NAMES = {
	"compilation.children[]": "compilation",
	"compilation.modules[]": "module",
	"compilation.entrypoints[]": "chunkGroup",
	"compilation.namedChunkGroups[]": "chunkGroup",
	"compilation.errors[]": "error",
	"compilation.warnings[]": "warning",
	"chunk.modules[]": "module",
	"chunk.rootModules[]": "module",
	"chunk.origins[]": "chunkOrigin",
	"compilation.chunks[]": "chunk",
	"compilation.assets[]": "asset",
	"asset.related[]": "asset",
	"module.issuerPath[]": "moduleIssuer",
	"module.reasons[]": "moduleReason",
	"module.modules[]": "module",
	"module.children[]": "module",
	"moduleTrace[]": "moduleTraceItem",
	"moduleTraceItem.dependencies[]": "moduleTraceDependency"
};

/**
 * @param {Object[]} items items to be merged
 * @returns {Object} an object
 */
const mergeToObject = items => {
	const obj = Object.create(null);
	for (const item of items) {
		obj[item.name] = item;
	}
	return obj;
};

/** @type {Record<string, (items: Object[]) => any>} */
const MERGER = {
	"compilation.entrypoints": mergeToObject,
	"compilation.namedChunkGroups": mergeToObject
};

class DefaultStatsFactoryPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap("DefaultStatsFactoryPlugin", compilation => {
			compilation.hooks.statsFactory.tap(
				"DefaultStatsFactoryPlugin",
				(stats, options, context) => {
					iterateConfig(SIMPLE_EXTRACTORS, options, (hookFor, fn) => {
						stats.hooks.extract
							.for(hookFor)
							.tap("DefaultStatsFactoryPlugin", (obj, data, ctx) =>
								fn(obj, data, ctx, options, stats)
							);
					});
					iterateConfig(FILTER, options, (hookFor, fn) => {
						stats.hooks.filter
							.for(hookFor)
							.tap("DefaultStatsFactoryPlugin", (item, ctx, idx, i) =>
								fn(item, ctx, options, idx, i)
							);
					});
					iterateConfig(FILTER_RESULTS, options, (hookFor, fn) => {
						stats.hooks.filterResults
							.for(hookFor)
							.tap("DefaultStatsFactoryPlugin", (item, ctx, idx, i) =>
								fn(item, ctx, options, idx, i)
							);
					});
					iterateConfig(SORTERS, options, (hookFor, fn) => {
						stats.hooks.sort
							.for(hookFor)
							.tap("DefaultStatsFactoryPlugin", (comparators, ctx) =>
								fn(comparators, ctx, options)
							);
					});
					iterateConfig(RESULT_SORTERS, options, (hookFor, fn) => {
						stats.hooks.sortResults
							.for(hookFor)
							.tap("DefaultStatsFactoryPlugin", (comparators, ctx) =>
								fn(comparators, ctx, options)
							);
					});
					iterateConfig(RESULT_GROUPERS, options, (hookFor, fn) => {
						stats.hooks.groupResults
							.for(hookFor)
							.tap("DefaultStatsFactoryPlugin", (groupConfigs, ctx) =>
								fn(groupConfigs, ctx, options)
							);
					});
					for (const key of Object.keys(ITEM_NAMES)) {
						const itemName = ITEM_NAMES[key];
						stats.hooks.getItemName
							.for(key)
							.tap("DefaultStatsFactoryPlugin", () => itemName);
					}
					for (const key of Object.keys(MERGER)) {
						const merger = MERGER[key];
						stats.hooks.merge.for(key).tap("DefaultStatsFactoryPlugin", merger);
					}
					if (options.children) {
						if (Array.isArray(options.children)) {
							stats.hooks.getItemFactory
								.for("compilation.children[].compilation")
								.tap("DefaultStatsFactoryPlugin", (comp, { _index: idx }) => {
									if (idx < options.children.length) {
										return compilation.createStatsFactory(
											compilation.createStatsOptions(
												options.children[idx],
												context
											)
										);
									}
								});
						} else if (options.children !== true) {
							const childFactory = compilation.createStatsFactory(
								compilation.createStatsOptions(options.children, context)
							);
							stats.hooks.getItemFactory
								.for("compilation.children[].compilation")
								.tap("DefaultStatsFactoryPlugin", () => {
									return childFactory;
								});
						}
					}
				}
			);
		});
	}
}
module.exports = DefaultStatsFactoryPlugin;
