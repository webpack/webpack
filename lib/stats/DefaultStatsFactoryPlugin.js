/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleDependency = require("../dependencies/ModuleDependency");
const formatLocation = require("../formatLocation");
const { LogType } = require("../logging/Logger");
const AggressiveSplittingPlugin = require("../optimize/AggressiveSplittingPlugin");
const ConcatenatedModule = require("../optimize/ConcatenatedModule");
const SizeLimitsPlugin = require("../performance/SizeLimitsPlugin");
const {
	compareLocations,
	compareChunksById,
	compareNumbers,
	compareIds,
	concatComparators,
	compareSelect,
	compareModulesByIdentifier
} = require("../util/comparators");
const identifierUtils = require("../util/identifier");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../ChunkGroup").OriginRecord} OriginRecord */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compilation").Asset} Asset */
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
/** @typedef {import("./StatsFactory")} StatsFactory */

/** @typedef {Asset & { type: string, related: ExtendedAsset[] }} ExtendedAsset */

/**
 * @typedef {Object} UsualContext
 * @property {string} type
 * @property {Compilation} compilation
 * @property {Map<string,Chunk[]>} compilationFileToChunks
 * @property {Map<string,Chunk[]>} compilationAuxiliaryFileToChunks
 * @property {number} startTime
 * @property {number} endTime
 * @property {RuntimeSpec} runtime
 */

/**
 * @typedef {Object} UsualOptions
 * @property {string} context
 * @property {RequestShortener} requestShortener
 * @property {string} chunksSort
 * @property {string} modulesSort
 * @property {string} chunkRootModulesSort
 * @property {string} chunkModulesSort
 * @property {string} nestedModulesSort
 * @property {string} assetsSort
 * @property {Function[]} excludeAssets
 * @property {Function[]} excludeModules
 * @property {Function[]} warningsFilter
 * @property {number} maxModules
 * @property {false|"none"|"error"|"warn"|"info"|"log"|"verbose"} logging
 * @property {Function[]} loggingDebug
 * @property {boolean} loggingTrace
 * @property {any} _env
 */

/** @template T @typedef {Record<string, (object: Object, data: T, context: UsualContext, options: UsualOptions, factory: StatsFactory) => void>} ExtractorsByOption */

/**
 * @typedef {Object} SimpleExtractors
 * @property {ExtractorsByOption<Compilation>} compilation
 * @property {ExtractorsByOption<ExtendedAsset>} asset
 * @property {ExtractorsByOption<{ name: string, chunkGroup: ChunkGroup }>} chunkGroup
 * @property {ExtractorsByOption<Module>} module
 * @property {ExtractorsByOption<Module>} moduleIssuer
 * @property {ExtractorsByOption<ModuleProfile>} profile
 * @property {ExtractorsByOption<ModuleGraphConnection>} moduleReason
 * @property {ExtractorsByOption<Chunk>} chunk
 * @property {ExtractorsByOption<OriginRecord>} chunkOrigin
 * @property {ExtractorsByOption<WebpackError>} error
 * @property {ExtractorsByOption<WebpackError>} warning
 * @property {ExtractorsByOption<{ origin: Module, module: Module }>} moduleTraceItem
 * @property {ExtractorsByOption<Dependency>} moduleTraceDependency
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
 * @template T
 * @param {Iterable<T>} iterable an iterable
 * @returns {number} count of items
 */
const countIterable = iterable => {
	let i = 0;
	// eslint-disable-next-line no-unused-vars
	for (const _ of iterable) i++;
	return i;
};

/** @type {ExtractorsByOption<WebpackError | string>} */
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
	errorDetails: (object, error) => {
		if (typeof error !== "string") {
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
		_: (object, compilation) => {
			if (compilation.name) {
				object.name = compilation.name;
			}
			if (compilation.needAdditionalPass) {
				object.needAdditionalPass = true;
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
		timings: (object, compilation, { startTime, endTime }) => {
			object.time = endTime - startTime;
		},
		builtAt: (object, compilation, { endTime }) => {
			object.builtAt = endTime;
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
			/** @type {Map<string, ExtendedAsset>} */
			const assetMap = new Map();
			const assets = new Set();
			for (const asset of compilation.getAssets()) {
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
			object.assets = factory.create(`${type}.assets`, Array.from(assets), {
				...context,
				compilationFileToChunks,
				compilationAuxiliaryFileToChunks
			});
			object.filteredAssets = assets.size - object.assets.length;
			object.assetsByChunkName = {};
			for (const asset of object.assets) {
				for (const name of asset.chunkNames) {
					if (
						!Object.prototype.hasOwnProperty.call(
							object.assetsByChunkName,
							name
						)
					) {
						object.assetsByChunkName[name] = [];
					}
					object.assetsByChunkName[name].push(asset.name);
				}
			}
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
			object.modules = factory.create(`${type}.modules`, array, context);
			object.filteredModules = array.length - object.modules.length;
		},
		entrypoints: (object, compilation, context, options, factory) => {
			const { type } = context;
			const array = Array.from(compilation.entrypoints, ([key, value]) => ({
				name: key,
				chunkGroup: value
			}));
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
			const { type } = context;
			object.errors = factory.create(
				`${type}.errors`,
				compilation.errors,
				context
			);
		},
		warnings: (object, compilation, context, options, factory) => {
			const { type } = context;
			object.warnings = factory.create(
				`${type}.warnings`,
				compilation.warnings,
				context
			);
		},
		logging: (object, compilation, _context, options, factory) => {
			const util = require("util");
			const { loggingDebug, loggingTrace, context } = options;
			object.logging = {};
			let acceptedTypes;
			let collapsedGroups = false;
			switch (options.logging) {
				case "none":
					acceptedTypes = new Set([]);
					break;
				case "error":
					acceptedTypes = new Set([LogType.error]);
					break;
				case "warn":
					acceptedTypes = new Set([LogType.error, LogType.warn]);
					break;
				case "info":
					acceptedTypes = new Set([LogType.error, LogType.warn, LogType.info]);
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
			const makePathsRelative = identifierUtils.makePathsRelative.bindContextCache(
				context,
				compilation.compiler.root
			);
			let depthInCollapsedGroup = 0;
			for (const [origin, logEntries] of compilation.logging) {
				const debugMode = loggingDebug.some(fn => fn(origin));
				const groupStack = [];
				const rootList = [];
				let currentList = rootList;
				let processedLogEntries = 0;
				for (const entry of logEntries) {
					let type = entry.type;
					if (!debugMode && !acceptedTypes.has(type)) continue;

					// Expand groups in verbose and debug modes
					if (type === LogType.groupCollapsed && (debugMode || collapsedGroups))
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
				let name = makePathsRelative(origin).replace(/\|/g, " ");
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
		_: (
			object,
			asset,
			{ compilation, compilationFileToChunks, compilationAuxiliaryFileToChunks }
		) => {
			object.type = asset.type;
			object.name = asset.name;
			object.size = asset.source.size();
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
			object.emitted = compilation.emittedAssets.has(asset.name);
			object.comparedForEmit = compilation.comparedForEmitAssets.has(
				asset.name
			);
			object.info = asset.info;
			object.filteredRelated = asset.related ? asset.related.length : undefined;
		},
		relatedAssets: (object, asset, context, options, factory) => {
			const { type } = context;
			object.related = factory.create(
				`${type}.related`,
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
			{ compilation: { moduleGraph, chunkGraph } }
		) => {
			const children = chunkGroup.getChildrenByOrders(moduleGraph, chunkGraph);
			Object.assign(object, {
				name,
				chunks: chunkGroup.chunks.map(c => c.id),
				assets: uniqueArray(chunkGroup.chunks, c => c.files),
				auxiliaryAssets: uniqueOrderedArray(
					chunkGroup.chunks,
					c => c.auxiliaryFiles,
					compareIds
				),
				children: mapObject(children, groups =>
					groups.map(group => ({
						name: group.name,
						chunks: group.chunks.map(c => c.id),
						assets: uniqueArray(group.chunks, c => c.files),
						auxiliaryAssets: uniqueOrderedArray(
							group.chunks,
							c => c.auxiliaryFiles,
							compareIds
						)
					}))
				),
				childAssets: mapObject(children, groups => {
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
			});
		},
		performance: (object, { chunkGroup }) => {
			object.isOverSizeLimit = SizeLimitsPlugin.isOverSizeLimit(chunkGroup);
		}
	},
	module: {
		_: (object, module, context, { requestShortener }, factory) => {
			const { compilation, type } = context;
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
			const sizes = {};
			for (const sourceType of module.getSourceTypes()) {
				sizes[sourceType] = module.size(sourceType);
			}
			Object.assign(object, {
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener),
				index: moduleGraph.getPreOrderIndex(module),
				preOrderIndex: moduleGraph.getPreOrderIndex(module),
				index2: moduleGraph.getPostOrderIndex(module),
				postOrderIndex: moduleGraph.getPostOrderIndex(module),
				size: module.size(),
				sizes,
				cacheable: module.buildInfo.cacheable,
				built: compilation.builtModules.has(module),
				optional: module.isOptional(moduleGraph),
				runtime: module.type === "runtime",
				issuer: issuer && issuer.identifier(),
				issuerName: issuer && issuer.readableIdentifier(requestShortener),
				issuerPath:
					issuer && factory.create(`${type}.issuerPath`, path, context),
				failed: errorsCount > 0,
				errors: errorsCount,
				warnings: warningsCount
			});
			if (profile) {
				object.profile = factory.create(`${type}.profile`, profile, context);
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
		orphanModules: (object, module, { compilation, type }) => {
			if (!type.endsWith("module.modules[].module")) {
				object.orphan =
					compilation.chunkGraph.getNumberOfModuleChunks(module) === 0;
			}
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
			object.reasons = factory.create(
				`${type}.reasons`,
				Array.from(moduleGraph.getIncomingConnections(module)),
				context
			);
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
			if (module instanceof ConcatenatedModule) {
				const modules = module.modules;
				object.modules = factory.create(`${type}.modules`, modules, context);
				object.filteredModules = modules.length - object.modules.length;
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
			Object.assign(object, {
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
			});
		}
	},
	moduleIssuer: {
		_: (object, module, context, { requestShortener }, factory) => {
			const { compilation, type } = context;
			const { moduleGraph } = compilation;
			const profile = moduleGraph.getProfile(module);
			Object.assign(object, {
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener)
			});
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
			Object.assign(object, {
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
			});
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
		_: (object, chunk, { compilation: { chunkGraph } }) => {
			const childIdByOrder = chunk.getChildIdsByOrders(chunkGraph);

			Object.assign(object, {
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
						? [chunk.runtime]
						: Array.from(chunk.runtime.sort()),
				files: Array.from(chunk.files),
				auxiliaryFiles: Array.from(chunk.auxiliaryFiles).sort(compareIds),
				hash: chunk.renderedHash,
				childrenByOrder: childIdByOrder
			});
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
			object.modules = factory.create(`${type}.modules`, array, {
				...context,
				runtime: chunk.runtime
			});
			object.filteredModules = array.length - object.modules.length;
		},
		chunkRootModules: (object, chunk, context, options, factory) => {
			const {
				type,
				compilation: { chunkGraph }
			} = context;
			const array = chunkGraph.getChunkRootModules(chunk);
			object.rootModules = factory.create(
				`${type}.rootModules`,
				array,
				context
			);
			object.filteredRootModules = array.length - object.rootModules.length;
			object.nonRootModules =
				chunkGraph.getNumberOfChunkModules(chunk) - array.length;
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
			Object.assign(object, {
				module: origin.module ? origin.module.identifier() : "",
				moduleIdentifier: origin.module ? origin.module.identifier() : "",
				moduleName: origin.module
					? origin.module.readableIdentifier(requestShortener)
					: "",
				loc: formatLocation(origin.loc),
				request: origin.request
			});
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

const EXCLUDE_MODULES_FILTER = type => (
	module,
	context,
	{ excludeModules, requestShortener }
) => {
	const name = module.nameForCondition();
	if (!name) return;
	const ident = requestShortener.shorten(name);
	const excluded = excludeModules.some(fn => fn(ident, module, type));
	if (excluded) return false;
};

/** @type {Record<string, (module: Module, context: UsualContext) => boolean | undefined>} */
const BASE_MODULES_FILTER = {
	"!cached": (module, { compilation }) => {
		if (!compilation.builtModules.has(module)) return false;
	},
	"!runtime": module => {
		if (module.type === "runtime") return false;
	}
};

const ASSETS_FILTER = {
	excludeAssets: (asset, context, { excludeAssets }) => {
		const ident = asset.name;
		const excluded = excludeAssets.some(fn => fn(ident, asset));
		if (excluded) return false;
	},
	"!cachedAssets": (asset, { compilation }) => {
		if (
			!compilation.emittedAssets.has(asset.name) &&
			!compilation.comparedForEmitAssets.has(asset.name)
		) {
			return false;
		}
	}
};

/** @type {Record<string, Record<string, (thing: any, context: UsualContext, options: UsualOptions) => boolean | undefined>>} */
const FILTER = {
	"compilation.assets": ASSETS_FILTER,
	"asset.related": ASSETS_FILTER,
	"compilation.modules": {
		excludeModules: EXCLUDE_MODULES_FILTER("module"),
		"!orphanModules": (module, { compilation: { chunkGraph } }) => {
			if (chunkGraph.getNumberOfModuleChunks(module) === 0) return false;
		},
		...BASE_MODULES_FILTER
	},
	"module.modules": {
		excludeModules: EXCLUDE_MODULES_FILTER("nested"),
		...BASE_MODULES_FILTER
	},
	"chunk.modules": {
		excludeModules: EXCLUDE_MODULES_FILTER("chunk"),
		...BASE_MODULES_FILTER
	},
	"chunk.rootModules": {
		excludeModules: EXCLUDE_MODULES_FILTER("root-of-chunk"),
		...BASE_MODULES_FILTER
	},
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

/** @type {Record<string, (module: Module, context: UsualContext, options: UsualOptions, idx: number, i: number) => boolean | undefined>} */
const FILTER_SORTED_MODULES = {
	maxModules: (module, context, { maxModules }, idx, i) => {
		if (i >= maxModules) return false;
	}
};

/** @type {Record<string, Record<string, (thing: any, context: UsualContext, options: UsualOptions, idx: number, i: number) => boolean | undefined>>} */
const FILTER_SORTED = {
	"compilation.modules": FILTER_SORTED_MODULES,
	"modules.modules": FILTER_SORTED_MODULES,
	"chunk.modules": FILTER_SORTED_MODULES,
	"chunk.rootModules": FILTER_SORTED_MODULES
};

/** @type {Record<string, Record<string, (thing: Object, context: UsualContext, options: UsualOptions) => boolean | undefined>>} */
const FILTER_RESULTS = {
	"compilation.warnings": {
		warningsFilter: (warning, context, { warningsFilter }) => {
			const warningString = Object.keys(warning)
				.map(key => `${warning[key]}`)
				.join("\n");
			return !warningsFilter.some(filter => filter(warning, warningString));
		}
	}
};

/** @type {Record<string, (comparators: Function[], context: UsualContext) => void>} */
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

/** @type {Record<string, Record<string, (comparators: Function[], context: UsualContext) => void>>} */
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

// remove a prefixed "!" that can be specified to reverse sort order
const normalizeFieldKey = field => {
	if (field[0] === "!") {
		return field.substr(1);
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
	assetsSort: (comparators, context, { assetsSort }) => {
		comparators.push(sortByField(assetsSort));
	},
	_: comparators => {
		comparators.push(compareSelect(a => a.name, compareIds));
	}
};

/** @type {Record<string, Record<string, (comparators: Function[], context: UsualContext, options: UsualOptions) => void>>} */
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
	"chunk.rootModules": {
		chunkRootModulesSort: (comparators, context, { chunkRootModulesSort }) => {
			comparators.push(sortByField(chunkRootModulesSort));
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
 * @param {UsualOptions} options stats options
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
					iterateConfig(FILTER_SORTED, options, (hookFor, fn) => {
						stats.hooks.filterSorted
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
