/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const formatLocation = require("../formatLocation");
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
	compareModulesById
} = require("../util/comparators");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGroup")} ChunkGroup */
/** @typedef {import("../ChunkGroup").OriginRecord} OriginRecord */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleProfile")} ModuleProfile */
/** @typedef {import("../RequestShortener")} RequestShortener */
/** @typedef {import("../WebpackError")} WebpackError */
/** @typedef {import("./StatsFactory")} StatsFactory */

/**
 * @typedef {Object} UsualContext
 * @property {string} type
 * @property {Compilation} compilation
 * @property {number} startTime
 * @property {number} endTime
 */

/**
 * @typedef {Object} UsualOptions
 * @property {RequestShortener} requestShortener
 * @property {string} chunksSort
 * @property {string} modulesSort
 * @property {string} assetsSort
 * @property {Function[]} excludeAssets
 * @property {Function[]} warningsFilter
 * @property {number} maxModules
 * @property {any} _env
 */

/** @template T @typedef {Record<string, (object: Object, data: T, context: UsualContext, options: UsualOptions, factory: StatsFactory) => void>} ExtractorsByOption */

/**
 * @typedef {Object} SimpleExtractors
 * @property {ExtractorsByOption<Compilation>} compilation
 * @property {ExtractorsByOption<{ name: string, source: Source }>} asset
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

/** @type {ExtractorsByOption<WebpackError | string>} */
const EXTRACT_ERROR = {
	_: (
		object,
		error,
		{ compilation: { chunkGraph, moduleGraph } },
		{ requestShortener }
	) => {
		// TODO webpack 6 disallow strings in the errors/warnings list
		if (typeof error === "string") {
			object.message = error;
		} else {
			if (error.chunk) {
				object.chunkId = error.chunk.id;
				object.chunkName = error.chunk.name;
				object.chunkEntry = error.chunk.hasRuntime();
				object.chunkInitial = error.chunk.canBeInitial();
			}
			if (error.file) {
				object.file = error.file;
			}
			if (error.module) {
				object.moduleId = chunkGraph.getModuleId(error.module);
				object.moduleIdentifier = error.module.identifier();
				object.moduleName = error.module.readableIdentifier(requestShortener);
			}
			if (error.loc) {
				object.loc = formatLocation(error.loc);
			}
			object.message = error.message;
		}
	},
	moduleTrace: (object, error, context, options, factory) => {
		if (typeof error !== "string" && error.module) {
			const {
				type,
				compilation: { moduleGraph }
			} = context;
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
			object.stack = error.stack;
			object.missing = error.missing;
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
			object.publicPath = compilation.mainTemplate.getPublicPath({
				hash: compilation.hash
			});
		},
		outputPath: (object, compilation) => {
			object.outputPath = compilation.mainTemplate.outputOptions.path;
		},
		assets: (object, compilation, context, options, factory) => {
			const { type } = context;
			const array = Object.keys(compilation.assets).map(name => {
				const source = compilation.assets[name];
				return {
					name,
					source
				};
			});
			object.assets = factory.create(`${type}.assets`, array, context);
			object.filteredAssets = array.length - object.assets.length;
			object.assetsByChunkName = {};
			for (const asset of object.assets) {
				for (const name of asset.chunkNames) {
					object.assetsByChunkName[name] = (
						object.assetsByChunkName[name] || []
					).concat(asset.name);
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
		_: (object, asset, { compilation }) => {
			object.name = asset.name;
			object.size = asset.source.size();
			const chunks = Array.from(compilation.chunks).filter(chunk =>
				chunk.files.includes(asset.name)
			);
			object.chunks = Array.from(
				chunks.reduce((ids, chunk) => {
					for (const id of chunk.ids) {
						ids.add(id);
					}
					return ids;
				}, /** @type {Set<string|number>} */ (new Set()))
			).sort(compareIds);
			object.chunkNames = Array.from(
				chunks.reduce((names, chunk) => {
					if (chunk.name) {
						names.add(chunk.name);
					}
					return names;
				}, /** @type {Set<string>} */ (new Set()))
			).sort(compareIds);
			object.emitted = compilation.emittedAssets.has(asset.source);
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
				assets: chunkGroup.chunks.reduce(
					(array, c) => array.concat(c.files || []),
					/** @type {string[]} */ ([])
				),
				children: Object.keys(children).reduce((obj, key) => {
					const groups = children[key];
					obj[key] = groups.map(group => ({
						name: group.name,
						chunks: group.chunks.map(c => c.id),
						assets: group.chunks.reduce(
							(array, c) => array.concat(c.files || []),
							/** @type {string[]} */ ([])
						)
					}));
					return obj;
				}, /** @type {Record<string, {name: string, chunks: (string|number)[], assets: string[]}[]>} */ Object.create(null)),
				childAssets: Object.keys(children).reduce((obj, key) => {
					const groups = children[key];
					obj[key] = Array.from(
						groups.reduce((set, group) => {
							for (const chunk of group.chunks) {
								for (const asset of chunk.files) {
									set.add(asset);
								}
							}
							return set;
						}, /** @type {Set<string>} */ (new Set()))
					);
					return obj;
				}, Object.create(null))
			});
		},
		performance: (object, { chunkGroup }) => {
			object.isOverSizeLimit = SizeLimitsPlugin.isOverSizeLimit(chunkGroup);
		}
	},
	module: {
		_: (object, module, context, { requestShortener }, factory) => {
			const { compilation, type } = context;
			const { chunkGraph, moduleGraph } = compilation;
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
			Object.assign(object, {
				id: chunkGraph.getModuleId(module),
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener),
				index: moduleGraph.getPreOrderIndex(module),
				preOrderIndex: moduleGraph.getPreOrderIndex(module),
				index2: moduleGraph.getPostOrderIndex(module),
				postOrderIndex: moduleGraph.getPostOrderIndex(module),
				size: module.size(),
				sizes: Array.from(module.getSourceTypes()).reduce((obj, type) => {
					obj[type] = module.size(type);
					return obj;
				}, {}),
				cacheable: module.buildInfo.cacheable,
				built: compilation.builtModules.has(module),
				optional: module.isOptional(moduleGraph),
				runtime: module.type === "runtime",
				chunks: Array.from(
					chunkGraph.getOrderedModuleChunksIterable(module, compareChunksById),
					chunk => chunk.id
				),
				issuer: issuer && issuer.identifier(),
				issuerId: issuer && chunkGraph.getModuleId(issuer),
				issuerName: issuer && issuer.readableIdentifier(requestShortener),
				issuerPath:
					issuer && factory.create(`${type}.issuerPath`, path, context),
				failed: module.errors ? module.errors.length > 0 : false,
				errors: module.errors ? module.errors.length : 0,
				warnings: module.warnings ? module.warnings.length : 0
			});
			if (profile) {
				object.profile = factory.create(`${type}.profile`, profile, context);
			}
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
				moduleGraph.getIncomingConnections(module),
				context
			);
		},
		usedExports: (object, module, { compilation: { moduleGraph } }) => {
			const usedExports = moduleGraph.getUsedExports(module);
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
			const { chunkGraph, moduleGraph } = compilation;
			const profile = moduleGraph.getProfile(module);
			Object.assign(object, {
				id: chunkGraph.getModuleId(module),
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener)
			});
			if (profile) {
				object.profile = factory.create(`${type}.profile`, profile, context);
			}
		}
	},
	moduleReason: {
		_: (
			object,
			reason,
			{ compilation: { chunkGraph } },
			{ requestShortener }
		) => {
			const depAsAny = /** @type {TODO} */ (reason.dependency);
			Object.assign(object, {
				moduleId: reason.originModule
					? chunkGraph.getModuleId(reason.originModule)
					: null,
				moduleIdentifier: reason.originModule
					? reason.originModule.identifier()
					: null,
				module: reason.originModule
					? reason.originModule.readableIdentifier(requestShortener)
					: null,
				moduleName: reason.originModule
					? reason.originModule.readableIdentifier(requestShortener)
					: null,
				type: reason.dependency ? reason.dependency.type : null,
				explanation: reason.explanation,
				userRequest:
					depAsAny && "userRequest" in depAsAny ? depAsAny.userRequest : null
			});
			if (reason.dependency) {
				const locInfo = formatLocation(reason.dependency.loc);
				if (locInfo) {
					object.loc = locInfo;
				}
			}
		}
	},
	chunk: {
		_: (object, chunk, { compilation: { chunkGraph } }) => {
			const childIdByOrder = chunk.getChildIdsByOrders(chunkGraph);

			Object.assign(object, {
				id: chunk.id,
				rendered: chunk.rendered,
				initial: chunk.canBeInitial(),
				entry: chunk.hasRuntime(),
				recorded: AggressiveSplittingPlugin.wasChunkRecorded(chunk),
				reason: chunk.chunkReason,
				size: chunkGraph.getChunkModulesSize(chunk),
				sizes: chunkGraph.getChunkModulesSizes(chunk),
				names: chunk.name ? [chunk.name] : [],
				files: chunk.files.slice(),
				hash: chunk.renderedHash,
				childrenByOrder: childIdByOrder
			});
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
			object.modules = factory.create(`${type}.modules`, array, context);
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
			const array = Array.from(chunk.groupsIterable, g => g.origins)
				.reduce((a, b) => a.concat(b), [])
				.filter(origin => {
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
		_: (
			object,
			origin,
			{ compilation: { chunkGraph } },
			{ requestShortener }
		) => {
			Object.assign(object, {
				moduleId: origin.module
					? chunkGraph.getModuleId(origin.module)
					: undefined,
				module: origin.module ? origin.module.identifier() : "",
				moduleIdentifier: origin.module ? origin.module.identifier() : "",
				moduleName: origin.module
					? origin.module.readableIdentifier(requestShortener)
					: "",
				loc: formatLocation(origin.loc),
				request: origin.request
			});
		}
	},
	error: EXTRACT_ERROR,
	warning: EXTRACT_ERROR,
	moduleTraceItem: {
		_: (object, { origin, module }, context, { requestShortener }, factory) => {
			const {
				type,
				compilation: { chunkGraph, moduleGraph }
			} = context;
			object.originId = chunkGraph.getModuleId(origin);
			object.originIdentifier = origin.identifier();
			object.originName = origin.readableIdentifier(requestShortener);
			object.moduleId = chunkGraph.getModuleId(module);
			object.moduleIdentifier = module.identifier();
			object.moduleName = module.readableIdentifier(requestShortener);
			const dependencies = moduleGraph
				.getIncomingConnections(module)
				.filter(c => c.resolvedOriginModule === origin && c.dependency)
				.map(c => c.dependency);
			object.dependencies = factory.create(
				`${type}.dependencies`,
				dependencies,
				context
			);
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

/** @type {Record<string, Record<string, (thing: any, context: UsualContext, options: UsualOptions) => boolean | undefined>>} */
const FILTER = {
	"compilation.assets": {
		excludeAssets: (asset, context, { excludeAssets }) => {
			const ident = asset.name;
			const excluded = excludeAssets.some(fn => fn(ident, asset));
			if (excluded) return false;
		}
	},
	"compilation.modules": Object.assign(
		{
			excludeModules: EXCLUDE_MODULES_FILTER("module"),
			"!orphanModules": (module, { compilation: { chunkGraph } }) => {
				if (chunkGraph.getNumberOfModuleChunks(module) === 0) return false;
			}
		},
		BASE_MODULES_FILTER
	),
	"module.modules": Object.assign(
		{
			excludeModules: EXCLUDE_MODULES_FILTER("nested")
		},
		BASE_MODULES_FILTER
	),
	"chunk.modules": Object.assign(
		{
			excludeModules: EXCLUDE_MODULES_FILTER("chunk")
		},
		BASE_MODULES_FILTER
	),
	"chunk.rootModules": Object.assign(
		{
			excludeModules: EXCLUDE_MODULES_FILTER("root-of-chunk")
		},
		BASE_MODULES_FILTER
	)
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
	"compilation.modules": MODULES_SORTER,
	"chunk.rootModules": MODULES_SORTER,
	"chunk.modules": MODULES_SORTER,
	"module.reasons": {
		_: (comparators, { compilation: { chunkGraph } }) => {
			comparators.push(
				compareSelect(x => x.originModule, compareModulesById(chunkGraph))
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

/** @type {Record<string, Record<string, (comparators: Function[], context: UsualContext, options: UsualOptions) => void>>} */
const RESULT_SORTERS = {
	"compilation.chunks": {
		chunksSort: (comparators, context, { chunksSort }) => {
			comparators.push(sortByField(chunksSort));
		},
		_: comparators => {
			comparators.push(compareSelect(c => c.id, compareIds));
		}
	},
	"compilation.modules": {
		modulesSort: (comparators, context, { modulesSort }) => {
			comparators.push(sortByField(modulesSort));
		}
	},
	"chunk.rootModules": {
		modulesSort: (comparators, context, { modulesSort }) => {
			comparators.push(sortByField(modulesSort));
		}
	},
	"chunk.modules": {
		modulesSort: (comparators, context, { modulesSort }) => {
			comparators.push(sortByField(modulesSort));
		}
	},
	"module.modules": {
		modulesSort: (comparators, context, { modulesSort }) => {
			comparators.push(sortByField(modulesSort));
		}
	},
	"compilation.assets": {
		assetsSort: (comparators, context, { assetsSort }) => {
			comparators.push(sortByField(assetsSort));
		},
		_: comparators => {
			comparators.push(compareSelect(a => a.name, compareIds));
		}
	}
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
	 * @param {Compiler} compiler webpack compiler
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
