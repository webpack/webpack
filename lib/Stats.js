/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RequestShortener = require("./RequestShortener");
const { formatSize } = require("./SizeFormatHelpers");
const compareLocations = require("./compareLocations");
const formatLocation = require("./formatLocation");
const AggressiveSplittingPlugin = require("./optimize/AggressiveSplittingPlugin");
const SizeLimitsPlugin = require("./performance/SizeLimitsPlugin");
const {
	compareChunksById,
	compareNumbers,
	compareIds,
	concatComparators,
	compareSelect,
	compareModulesById,
	keepOriginalOrder
} = require("./util/comparators");
const identifierUtils = require("./util/identifier");

/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ChunkGroup")} ChunkGroup */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("./Module")} Module */
/** @typedef {import("./ModuleProfile")} ModuleProfile */

const optionsOrFallback = (...args) => {
	let optionValues = [];
	optionValues.push(...args);
	return optionValues.find(optionValue => optionValue !== undefined);
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

class Stats {
	/**
	 * @param {Compilation} compilation webpack compilation
	 */
	constructor(compilation) {
		this.compilation = compilation;
		this.hash = compilation.hash;
		this.startTime = undefined;
		this.endTime = undefined;
	}

	static filterWarnings(warnings, warningsFilter) {
		// we dont have anything to filter so all warnings can be shown
		if (!warningsFilter) {
			return warnings;
		}

		// create a chain of filters
		// if they return "true" a warning should be suppressed
		const normalizedWarningsFilters = [].concat(warningsFilter).map(filter => {
			if (typeof filter === "string") {
				return warning => warning.includes(filter);
			}

			if (filter instanceof RegExp) {
				return warning => filter.test(warning);
			}

			if (typeof filter === "function") {
				return filter;
			}

			throw new Error(
				`Can only filter warnings with Strings or RegExps. (Given: ${filter})`
			);
		});
		return warnings.filter(warning => {
			return !normalizedWarningsFilters.some(check => check(warning));
		});
	}

	formatFilePath(filePath) {
		const OPTIONS_REGEXP = /^(\s|\S)*!/;
		return filePath.includes("!")
			? `${filePath.replace(OPTIONS_REGEXP, "")} (${filePath})`
			: `${filePath}`;
	}

	hasWarnings() {
		return (
			this.compilation.warnings.length > 0 ||
			this.compilation.children.some(child => child.getStats().hasWarnings())
		);
	}

	hasErrors() {
		return (
			this.compilation.errors.length > 0 ||
			this.compilation.children.some(child => child.getStats().hasErrors())
		);
	}

	toJson(options, forToString) {
		if (typeof options === "boolean" || typeof options === "string") {
			options = Stats.presetToOptions(options);
		} else if (!options) {
			options = {};
		}

		const optionOrLocalFallback = (v, def) =>
			v !== undefined ? v : options.all !== undefined ? options.all : def;

		const testAgainstGivenOption = item => {
			if (typeof item === "string") {
				const regExp = new RegExp(
					`[\\\\/]${item.replace(
						// eslint-disable-next-line no-useless-escape
						/[-[\]{}()*+?.\\^$|]/g,
						"\\$&"
					)}([\\\\/]|$|!|\\?)`
				);
				return ident => regExp.test(ident);
			}
			if (item && typeof item === "object" && typeof item.test === "function") {
				return ident => item.test(ident);
			}
			if (typeof item === "function") {
				return item;
			}
			if (typeof item === "boolean") {
				return () => item;
			}
		};

		const compilation = this.compilation;
		const moduleGraph = compilation.moduleGraph;
		const chunkGraph = compilation.chunkGraph;
		const context = optionsOrFallback(
			options.context,
			compilation.compiler.context
		);
		const requestShortener =
			compilation.compiler.context === context
				? compilation.requestShortener
				: new RequestShortener(context);
		const showPerformance = optionOrLocalFallback(options.performance, true);
		const showHash = optionOrLocalFallback(options.hash, true);
		const showEnv = optionOrLocalFallback(options.env, false);
		const showVersion = optionOrLocalFallback(options.version, true);
		const showTimings = optionOrLocalFallback(options.timings, true);
		const showBuiltAt = optionOrLocalFallback(options.builtAt, true);
		const showAssets = optionOrLocalFallback(options.assets, true);
		const showEntrypoints = optionOrLocalFallback(options.entrypoints, true);
		const showChunkGroups = optionOrLocalFallback(
			options.chunkGroups,
			!forToString
		);
		const showChunks = optionOrLocalFallback(options.chunks, !forToString);
		const showChunkModules = optionOrLocalFallback(options.chunkModules, true);
		const showChunkOrigins = optionOrLocalFallback(
			options.chunkOrigins,
			!forToString
		);
		const showModules = optionOrLocalFallback(options.modules, true);
		const showNestedModules = optionOrLocalFallback(
			options.nestedModules,
			true
		);
		const showOrphanModules = optionOrLocalFallback(
			options.orphanModules,
			false
		);
		const showModuleAssets = optionOrLocalFallback(
			options.moduleAssets,
			!forToString
		);
		const showDepth = optionOrLocalFallback(options.depth, !forToString);
		const showCachedModules = optionOrLocalFallback(options.cached, true);
		const showCachedAssets = optionOrLocalFallback(options.cachedAssets, true);
		const showReasons = optionOrLocalFallback(options.reasons, !forToString);
		const showUsedExports = optionOrLocalFallback(
			options.usedExports,
			!forToString
		);
		const showProvidedExports = optionOrLocalFallback(
			options.providedExports,
			!forToString
		);
		const showOptimizationBailout = optionOrLocalFallback(
			options.optimizationBailout,
			!forToString
		);
		const showChildren = optionOrLocalFallback(options.children, true);
		const showSource = optionOrLocalFallback(options.source, false);
		const showModuleTrace = optionOrLocalFallback(options.moduleTrace, true);
		const showErrors = optionOrLocalFallback(options.errors, true);
		const showErrorDetails = optionOrLocalFallback(
			options.errorDetails,
			!forToString
		);
		const showWarnings = optionOrLocalFallback(options.warnings, true);
		const warningsFilter = optionsOrFallback(options.warningsFilter, null);
		const showPublicPath = optionOrLocalFallback(
			options.publicPath,
			!forToString
		);
		const excludeModules = []
			.concat(optionsOrFallback(options.excludeModules, options.exclude, []))
			.map(testAgainstGivenOption);
		const excludeAssets = []
			.concat(optionsOrFallback(options.excludeAssets, []))
			.map(testAgainstGivenOption);
		const maxModules = optionsOrFallback(
			options.maxModules,
			forToString ? 15 : Infinity
		);
		const sortModules = optionsOrFallback(options.modulesSort, "id");
		const sortChunks = optionsOrFallback(options.chunksSort, "id");
		const sortAssets = optionsOrFallback(options.assetsSort, "name");
		const showOutputPath = optionOrLocalFallback(
			options.outputPath,
			!forToString
		);

		if (!showOrphanModules) {
			excludeModules.push((ident, module, type) => {
				return (
					chunkGraph.getNumberOfModuleChunks(module) === 0 && type !== "nested"
				);
			});
		}

		if (!showCachedModules) {
			excludeModules.push(
				(ident, module) => !compilation.builtModules.has(module)
			);
		}

		const createModuleFilter = type => {
			let i = 0;
			return module => {
				if (excludeModules.length > 0) {
					const ident = requestShortener.shorten(module.resource);
					const excluded = excludeModules.some(fn => fn(ident, module, type));
					if (excluded) return false;
				}
				const result = i < maxModules;
				i++;
				return result;
			};
		};

		const createAssetFilter = () => {
			return asset => {
				if (excludeAssets.length > 0) {
					const ident = asset.name;
					const excluded = excludeAssets.some(fn => fn(ident, asset));
					if (excluded) return false;
				}
				return showCachedAssets || asset.emitted;
			};
		};

		const sortRealModules = concatComparators(
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

		const formatError = e => {
			let text = "";
			if (typeof e === "string") {
				e = { message: e };
			}
			if (e.chunk) {
				text += `chunk ${e.chunk.name || e.chunk.id}${
					e.chunk.hasRuntime()
						? " [entry]"
						: e.chunk.canBeInitial()
							? " [initial]"
							: ""
				}\n`;
			}
			if (e.file) {
				text += `${e.file}\n`;
			}
			if (
				e.module &&
				e.module.readableIdentifier &&
				typeof e.module.readableIdentifier === "function"
			) {
				text += this.formatFilePath(
					e.module.readableIdentifier(requestShortener)
				);
				if (typeof e.loc === "object") {
					const locInfo = formatLocation(e.loc);
					if (locInfo) text += ` ${locInfo}`;
				}
				text += "\n";
			}
			text += e.message;
			if (showErrorDetails && e.details) {
				text += `\n${e.details}`;
			}
			if (showErrorDetails && e.missing) {
				text += e.missing.map(item => `\n[${item}]`).join("");
			}
			/** @type {Module} */
			let current = e.module;
			if (showModuleTrace) {
				while (current) {
					const origin = moduleGraph.getIssuer(current);
					if (!origin) break;
					text += `\n @ ${this.formatFilePath(
						origin.readableIdentifier(requestShortener)
					)}`;
					const connections = moduleGraph.getIncomingConnections(current);
					for (const c of connections) {
						if (
							c.resolvedOriginModule === origin &&
							c.dependency &&
							c.dependency.loc
						) {
							const locInfo = formatLocation(c.dependency.loc);
							if (locInfo) text += ` ${locInfo}`;
						}
					}
					current = origin;
				}
			}
			return text;
		};

		const obj = {
			errors: compilation.errors.map(formatError),
			warnings: Stats.filterWarnings(
				compilation.warnings.map(formatError),
				warningsFilter
			)
		};

		//We just hint other renderers since actually omitting
		//errors/warnings from the JSON would be kind of weird.
		Object.defineProperty(obj, "_showWarnings", {
			value: showWarnings,
			enumerable: false
		});
		Object.defineProperty(obj, "_showErrors", {
			value: showErrors,
			enumerable: false
		});

		if (showVersion) {
			obj.version = require("../package.json").version;
		}

		if (showHash) obj.hash = this.hash;
		if (showTimings && this.startTime && this.endTime) {
			obj.time = this.endTime - this.startTime;
		}

		if (showBuiltAt && this.endTime) {
			obj.builtAt = this.endTime;
		}

		if (showEnv && options._env) {
			obj.env = options._env;
		}

		if (compilation.needAdditionalPass) {
			obj.needAdditionalPass = true;
		}
		if (showPublicPath) {
			obj.publicPath = this.compilation.mainTemplate.getPublicPath({
				hash: this.compilation.hash
			});
		}
		if (showOutputPath) {
			obj.outputPath = this.compilation.mainTemplate.outputOptions.path;
		}
		if (showAssets) {
			const assetsByFile = {};
			const compilationAssets = Object.keys(compilation.assets);
			obj.assetsByChunkName = {};
			obj.assets = compilationAssets
				.map(asset => {
					const obj = {
						name: asset,
						size: compilation.assets[asset].size(),
						chunks: [],
						chunkNames: [],
						emitted: compilation.assets[asset].emitted
					};

					if (showPerformance) {
						obj.isOverSizeLimit = SizeLimitsPlugin.isOverSizeLimit(
							compilation.assets[asset]
						);
					}

					assetsByFile[asset] = obj;
					return obj;
				})
				.filter(createAssetFilter());
			obj.filteredAssets = compilationAssets.length - obj.assets.length;

			for (const chunk of compilation.chunks) {
				for (const asset of chunk.files) {
					if (assetsByFile[asset]) {
						for (const id of chunk.ids) {
							assetsByFile[asset].chunks.push(id);
						}
						if (chunk.name) {
							assetsByFile[asset].chunkNames.push(chunk.name);
							if (obj.assetsByChunkName[chunk.name]) {
								obj.assetsByChunkName[chunk.name] = []
									.concat(obj.assetsByChunkName[chunk.name])
									.concat([asset]);
							} else {
								obj.assetsByChunkName[chunk.name] = asset;
							}
						}
					}
				}
			}
			if (sortAssets) {
				obj.assets.sort(
					concatComparators(
						sortByField(sortAssets),
						compareSelect(a => a.name, compareIds)
					)
				);
			}
		}

		/**
		 * @param {Map<string, ChunkGroup>} groupMap map from name to chunk group
		 * @returns {Object} chunk group stats object
		 */
		const fnChunkGroup = groupMap => {
			const obj = {};
			for (const keyValuePair of groupMap) {
				const name = keyValuePair[0];
				const cg = keyValuePair[1];
				const children = cg.getChildrenByOrders(moduleGraph, chunkGraph);
				obj[name] = {
					chunks: cg.chunks.map(c => c.id),
					assets: cg.chunks.reduce(
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
				};
				if (showPerformance) {
					obj[name].isOverSizeLimit = SizeLimitsPlugin.isOverSizeLimit(cg);
				}
			}

			return obj;
		};

		if (showEntrypoints) {
			obj.entrypoints = fnChunkGroup(compilation.entrypoints);
		}

		if (showChunkGroups) {
			obj.namedChunkGroups = fnChunkGroup(compilation.namedChunkGroups);
		}

		/**
		 * @param {ModuleProfile} profile the profile of the module
		 * @returns {any} stats info
		 */
		const fnProfile = profile => {
			if (!profile) return undefined;
			return {
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
		};

		const fnModule = (module, nested) => {
			const path = [];
			const issuer = moduleGraph.getIssuer(module);
			let current = issuer;
			while (current) {
				path.push(current);
				current = moduleGraph.getIssuer(current);
			}
			path.reverse();
			const obj = {
				id: chunkGraph.getModuleId(module),
				identifier: module.identifier(),
				name: module.readableIdentifier(requestShortener),
				index: moduleGraph.getPreOrderIndex(module),
				preOrderIndex: moduleGraph.getPreOrderIndex(module),
				index2: moduleGraph.getPostOrderIndex(module),
				postOrderIndex: moduleGraph.getPostOrderIndex(module),
				size: module.size(),
				cacheable: module.buildInfo.cacheable,
				built: compilation.builtModules.has(module),
				optional: module.isOptional(moduleGraph),
				chunks: Array.from(
					chunkGraph.getOrderedModuleChunksIterable(module, compareChunksById),
					chunk => chunk.id
				),
				issuer: issuer && issuer.identifier(),
				issuerId: issuer && chunkGraph.getModuleId(issuer),
				issuerName: issuer && issuer.readableIdentifier(requestShortener),
				issuerPath:
					issuer &&
					path.map(module => ({
						id: chunkGraph.getModuleId(module),
						identifier: module.identifier(),
						name: module.readableIdentifier(requestShortener),
						profile: fnProfile(moduleGraph.getProfile(module))
					})),
				profile: fnProfile(moduleGraph.getProfile(module)),
				failed: !!module.error,
				errors: module.errors ? module.errors.length : 0,
				warnings: module.warnings ? module.warnings.length : 0
			};
			if (showOrphanModules && !nested) {
				obj.orphan = chunkGraph.getNumberOfModuleChunks(module) === 0;
			}
			if (showModuleAssets) {
				obj.assets = Object.keys(module.buildInfo.assets || {});
			}
			if (showReasons) {
				obj.reasons = moduleGraph
					.getIncomingConnections(module)
					.sort(
						concatComparators(
							compareSelect(
								x => x.originModule,
								compareModulesById(chunkGraph)
							),
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
						)
					)
					.map(reason => {
						const depAsAny = /** @type {TODO} */ (reason.dependency);
						const obj = {
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
								depAsAny && "userRequest" in depAsAny
									? depAsAny.userRequest
									: null
						};
						if (reason.dependency) {
							const locInfo = formatLocation(reason.dependency.loc);
							if (locInfo) {
								obj.loc = locInfo;
							}
						}
						return obj;
					});
			}
			if (showUsedExports) {
				const usedExports = moduleGraph.getUsedExports(module);
				if (usedExports === null) {
					obj.usedExports = null;
				} else if (typeof usedExports === "boolean") {
					obj.usedExports = usedExports;
				} else {
					obj.usedExports = Array.from(usedExports);
				}
			}
			if (showProvidedExports) {
				obj.providedExports = Array.isArray(module.buildMeta.providedExports)
					? module.buildMeta.providedExports
					: null;
			}
			if (showOptimizationBailout) {
				obj.optimizationBailout = moduleGraph
					.getOptimizationBailout(module)
					.map(item => {
						if (typeof item === "function") return item(requestShortener);
						return item;
					});
			}
			if (showDepth) {
				obj.depth = moduleGraph.getDepth(module);
			}
			if (showNestedModules) {
				if (module.modules) {
					const modules = module.modules;
					obj.modules = modules
						.filter(createModuleFilter("nested"))
						.map(m => fnModule(m, true));
					obj.filteredModules = modules.length - obj.modules.length;
					if (sortModules) {
						obj.modules.sort(
							concatComparators(
								sortByField(sortModules),
								keepOriginalOrder(obj.modules)
							)
						);
					}
				}
			}
			if (showSource && module._source) {
				obj.source = module._source.source();
			}
			return obj;
		};
		if (showChunks) {
			obj.chunks = Array.from(compilation.chunks).map(chunk => {
				const parents = new Set();
				const children = new Set();
				const siblings = new Set();
				const childIdByOrder = chunk.getChildIdsByOrders(chunkGraph);
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
				const obj = {
					id: chunk.id,
					rendered: chunk.rendered,
					initial: chunk.canBeInitial(),
					entry: chunk.hasRuntime(),
					recorded: AggressiveSplittingPlugin.wasChunkRecorded(chunk),
					reason: chunk.chunkReason,
					size: chunkGraph.getChunkModulesSize(chunk),
					names: chunk.name ? [chunk.name] : [],
					files: chunk.files.slice(),
					hash: chunk.renderedHash,
					siblings: Array.from(siblings).sort(compareIds),
					parents: Array.from(parents).sort(compareIds),
					children: Array.from(children).sort(compareIds),
					childrenByOrder: childIdByOrder
				};
				if (showChunkModules) {
					obj.modules = chunkGraph
						.getChunkModules(chunk)
						.slice()
						.sort(sortRealModules)
						.filter(createModuleFilter("chunk"))
						.map(m => fnModule(m));
					obj.filteredModules =
						chunkGraph.getNumberOfChunkModules(chunk) - obj.modules.length;
					if (sortModules) {
						obj.modules.sort(
							concatComparators(
								sortByField(sortModules),
								keepOriginalOrder(obj.modules)
							)
						);
					}
				}
				if (showChunkOrigins) {
					obj.origins = Array.from(chunk.groupsIterable, g => g.origins)
						.reduce((a, b) => a.concat(b), [])
						.map(origin => ({
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
						}))
						.sort(
							concatComparators(
								compareSelect(m => m.moduleId, compareIds),
								compareSelect(m => m.loc, compareIds)
							)
						);
				}
				return obj;
			});
			obj.chunks.sort(
				concatComparators(
					sortByField(sortChunks),
					compareSelect(c => c.id, compareIds)
				)
			);
		}
		if (showModules) {
			obj.modules = Array.from(compilation.modules)
				.sort(sortRealModules)
				.filter(createModuleFilter("module"))
				.map(m => fnModule(m));
			obj.filteredModules = compilation.modules.size - obj.modules.length;
			if (sortModules) {
				obj.modules.sort(
					concatComparators(
						sortByField(sortModules),
						keepOriginalOrder(obj.modules)
					)
				);
			}
		}
		if (showChildren) {
			obj.children = compilation.children.map((child, idx) => {
				const childOptions = Stats.getChildOptions(options, idx);
				const obj = new Stats(child).toJson(childOptions, forToString);
				delete obj.hash;
				delete obj.version;
				if (child.name) {
					obj.name = identifierUtils.makePathsRelative(
						context,
						child.name,
						compilation.compiler.root
					);
				}
				return obj;
			});
		}

		return obj;
	}

	toString(options) {
		if (typeof options === "boolean" || typeof options === "string") {
			options = Stats.presetToOptions(options);
		} else if (!options) {
			options = {};
		}

		const useColors = optionsOrFallback(options.colors, false);

		const obj = this.toJson(options, true);

		return Stats.jsonToString(obj, useColors);
	}

	static jsonToString(obj, useColors) {
		const buf = [];

		const defaultColors = {
			bold: "\u001b[1m",
			yellow: "\u001b[1m\u001b[33m",
			red: "\u001b[1m\u001b[31m",
			green: "\u001b[1m\u001b[32m",
			cyan: "\u001b[1m\u001b[36m",
			magenta: "\u001b[1m\u001b[35m"
		};

		const colors = Object.keys(defaultColors).reduce(
			(obj, color) => {
				obj[color] = str => {
					if (useColors) {
						buf.push(
							useColors === true || useColors[color] === undefined
								? defaultColors[color]
								: useColors[color]
						);
					}
					buf.push(str);
					if (useColors) {
						buf.push("\u001b[39m\u001b[22m");
					}
				};
				return obj;
			},
			{
				normal: str => buf.push(str)
			}
		);

		const coloredTime = time => {
			let times = [800, 400, 200, 100];
			if (obj.time) {
				times = [obj.time / 2, obj.time / 4, obj.time / 8, obj.time / 16];
			}
			if (time < times[3]) colors.normal(`${time}ms`);
			else if (time < times[2]) colors.bold(`${time}ms`);
			else if (time < times[1]) colors.green(`${time}ms`);
			else if (time < times[0]) colors.yellow(`${time}ms`);
			else colors.red(`${time}ms`);
		};

		const newline = () => buf.push("\n");

		const getText = (arr, row, col) => {
			return arr[row][col].value;
		};

		const table = (array, align, splitter) => {
			const rows = array.length;
			const cols = array[0].length;
			const colSizes = new Array(cols);
			for (let col = 0; col < cols; col++) {
				colSizes[col] = 0;
			}
			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					const value = `${getText(array, row, col)}`;
					if (value.length > colSizes[col]) {
						colSizes[col] = value.length;
					}
				}
			}
			for (let row = 0; row < rows; row++) {
				for (let col = 0; col < cols; col++) {
					const format = array[row][col].color;
					const value = `${getText(array, row, col)}`;
					let l = value.length;
					if (align[col] === "l") {
						format(value);
					}
					for (; l < colSizes[col] && col !== cols - 1; l++) {
						colors.normal(" ");
					}
					if (align[col] === "r") {
						format(value);
					}
					if (col + 1 < cols && colSizes[col] !== 0) {
						colors.normal(splitter || "  ");
					}
				}
				newline();
			}
		};

		const getAssetColor = (asset, defaultColor) => {
			if (asset.isOverSizeLimit) {
				return colors.yellow;
			}

			return defaultColor;
		};

		if (obj.hash) {
			colors.normal("Hash: ");
			colors.bold(obj.hash);
			newline();
		}
		if (obj.version) {
			colors.normal("Version: webpack ");
			colors.bold(obj.version);
			newline();
		}
		if (typeof obj.time === "number") {
			colors.normal("Time: ");
			colors.bold(obj.time);
			colors.normal("ms");
			newline();
		}
		if (typeof obj.builtAt === "number") {
			const builtAtDate = new Date(obj.builtAt);
			colors.normal("Built at: ");
			colors.normal(
				builtAtDate.toLocaleDateString(undefined, {
					day: "2-digit",
					month: "2-digit",
					year: "numeric"
				})
			);
			colors.normal(" ");
			colors.bold(builtAtDate.toLocaleTimeString());
			newline();
		}
		if (obj.env) {
			colors.normal("Environment (--env): ");
			colors.bold(JSON.stringify(obj.env, null, 2));
			newline();
		}
		if (obj.publicPath) {
			colors.normal("PublicPath: ");
			colors.bold(obj.publicPath);
			newline();
		}

		if (obj.assets && obj.assets.length > 0) {
			const t = [
				[
					{
						value: "Asset",
						color: colors.bold
					},
					{
						value: "Size",
						color: colors.bold
					},
					{
						value: "Chunks",
						color: colors.bold
					},
					{
						value: "",
						color: colors.bold
					},
					{
						value: "",
						color: colors.bold
					},
					{
						value: "Chunk Names",
						color: colors.bold
					}
				]
			];
			for (const asset of obj.assets) {
				t.push([
					{
						value: asset.name,
						color: getAssetColor(asset, colors.green)
					},
					{
						value: formatSize(asset.size),
						color: getAssetColor(asset, colors.normal)
					},
					{
						value: asset.chunks.join(", "),
						color: colors.bold
					},
					{
						value: asset.emitted ? "[emitted]" : "",
						color: colors.green
					},
					{
						value: asset.isOverSizeLimit ? "[big]" : "",
						color: getAssetColor(asset, colors.normal)
					},
					{
						value: asset.chunkNames.join(", "),
						color: colors.normal
					}
				]);
			}
			table(t, "rrrlll");
		}
		if (obj.filteredAssets > 0) {
			colors.normal(" ");
			if (obj.assets.length > 0) colors.normal("+ ");
			colors.normal(obj.filteredAssets);
			if (obj.assets.length > 0) colors.normal(" hidden");
			colors.normal(obj.filteredAssets !== 1 ? " assets" : " asset");
			newline();
		}

		const processChunkGroups = (namedGroups, prefix) => {
			for (const name of Object.keys(namedGroups)) {
				const cg = namedGroups[name];
				colors.normal(`${prefix} `);
				colors.bold(name);
				if (cg.isOverSizeLimit) {
					colors.normal(" ");
					colors.yellow("[big]");
				}
				colors.normal(" =");
				for (const asset of cg.assets) {
					colors.normal(" ");
					colors.green(asset);
				}
				for (const name of Object.keys(cg.childAssets)) {
					const assets = cg.childAssets[name];
					if (assets && assets.length > 0) {
						colors.normal(" ");
						colors.magenta(`(${name}:`);
						for (const asset of assets) {
							colors.normal(" ");
							colors.green(asset);
						}
						colors.magenta(")");
					}
				}
				newline();
			}
		};

		if (obj.entrypoints) {
			processChunkGroups(obj.entrypoints, "Entrypoint");
		}

		if (obj.namedChunkGroups) {
			let outputChunkGroups = obj.namedChunkGroups;
			if (obj.entrypoints) {
				outputChunkGroups = Object.keys(outputChunkGroups)
					.filter(name => !obj.entrypoints[name])
					.reduce((result, name) => {
						result[name] = obj.namedChunkGroups[name];
						return result;
					}, {});
			}
			processChunkGroups(outputChunkGroups, "Chunk Group");
		}

		const modulesByIdentifier = {};
		if (obj.modules) {
			for (const module of obj.modules) {
				modulesByIdentifier[`$${module.identifier}`] = module;
			}
		} else if (obj.chunks) {
			for (const chunk of obj.chunks) {
				if (chunk.modules) {
					for (const module of chunk.modules) {
						modulesByIdentifier[`$${module.identifier}`] = module;
					}
				}
			}
		}

		const processModuleAttributes = module => {
			colors.normal(" ");
			colors.normal(formatSize(module.size));
			if (module.chunks) {
				for (const chunk of module.chunks) {
					colors.normal(" {");
					colors.yellow(chunk);
					colors.normal("}");
				}
			}
			if (typeof module.depth === "number") {
				colors.normal(` [depth ${module.depth}]`);
			}
			if (module.cacheable === false) {
				colors.red(" [not cacheable]");
			}
			if (module.orphan) {
				colors.yellow(" [orphan]");
			}
			if (module.optional) {
				colors.yellow(" [optional]");
			}
			if (module.built) {
				colors.green(" [built]");
			}
			if (module.assets && module.assets.length) {
				colors.magenta(
					` [${module.assets.length} asset${
						module.assets.length === 1 ? "" : "s"
					}]`
				);
			}
			if (module.failed) {
				colors.red(" [failed]");
			}
			if (module.warnings) {
				colors.yellow(
					` [${module.warnings} warning${module.warnings === 1 ? "" : "s"}]`
				);
			}
			if (module.errors) {
				colors.red(
					` [${module.errors} error${module.errors === 1 ? "" : "s"}]`
				);
			}
		};

		const processModuleContent = (module, prefix) => {
			if (Array.isArray(module.providedExports)) {
				colors.normal(prefix);
				if (module.providedExports.length === 0) {
					colors.cyan("[no exports]");
				} else {
					colors.cyan(`[exports: ${module.providedExports.join(", ")}]`);
				}
				newline();
			}
			if (module.usedExports !== undefined) {
				if (module.usedExports !== true) {
					colors.normal(prefix);
					if (module.usedExports === null) {
						colors.cyan("[used exports unknown]");
					} else if (module.usedExports === false) {
						colors.cyan("[module unused]");
					} else if (
						Array.isArray(module.usedExports) &&
						module.usedExports.length === 0
					) {
						colors.cyan("[no exports used]");
					} else if (Array.isArray(module.usedExports)) {
						const providedExportsCount = Array.isArray(module.providedExports)
							? module.providedExports.length
							: null;
						if (
							providedExportsCount !== null &&
							providedExportsCount === module.usedExports.length
						) {
							colors.cyan("[all exports used]");
						} else {
							colors.cyan(
								`[only some exports used: ${module.usedExports.join(", ")}]`
							);
						}
					}
					newline();
				}
			}
			if (Array.isArray(module.optimizationBailout)) {
				for (const item of module.optimizationBailout) {
					colors.normal(prefix);
					colors.yellow(item);
					newline();
				}
			}
			if (module.reasons) {
				for (const reason of module.reasons) {
					colors.normal(prefix);
					if (reason.type) {
						colors.normal(reason.type);
						colors.normal(" ");
					}
					if (reason.userRequest) {
						colors.cyan(reason.userRequest);
						colors.normal(" ");
					}
					if (reason.moduleId !== null) {
						colors.normal("[");
						colors.normal(reason.moduleId);
						colors.normal("]");
					}
					if (reason.module && reason.module !== reason.moduleId) {
						colors.normal(" ");
						colors.magenta(reason.module);
					}
					if (reason.loc) {
						colors.normal(" ");
						colors.normal(reason.loc);
					}
					if (reason.explanation) {
						colors.normal(" ");
						colors.cyan(reason.explanation);
					}
					newline();
				}
			}
			if (module.profile) {
				colors.normal(prefix);
				if (module.issuerPath) {
					for (const m of module.issuerPath) {
						colors.normal("[");
						colors.normal(m.id);
						colors.normal("] ");
						if (m.profile) {
							const time =
								m.profile.resolving +
								m.profile.restoring +
								m.profile.integration +
								m.profile.building +
								m.profile.storing;
							coloredTime(time);
							colors.normal(" ");
						}
						colors.normal("-> ");
					}
				}
				coloredTime(
					module.profile.resolving +
						module.profile.restoring +
						module.profile.integration +
						module.profile.building +
						module.profile.storing
				);
				colors.normal(" (resolving: ");
				coloredTime(module.profile.resolving);
				colors.normal(", restoring: ");
				coloredTime(module.profile.restoring);
				colors.normal(", integration: ");
				coloredTime(module.profile.integration);
				colors.normal(", building: ");
				coloredTime(module.profile.building);
				colors.normal(", storing: ");
				coloredTime(module.profile.storing);
				if (module.profile.additionalResolving) {
					colors.normal(", additional resolving: ");
					coloredTime(module.profile.additionalResolving);
				}
				if (module.profile.additionalIntegration) {
					colors.normal(", additional integration: ");
					coloredTime(module.profile.additionalIntegration);
				}
				colors.normal(")");
				newline();
			}
			if (module.modules) {
				processModulesList(module, prefix + "| ");
			}
		};

		const processModulesList = (obj, prefix) => {
			if (obj.modules) {
				let maxModuleId = 0;
				for (const module of obj.modules) {
					if (typeof module.id === "number") {
						if (maxModuleId < module.id) maxModuleId = module.id;
					}
				}
				let contentPrefix = prefix + "    ";
				if (maxModuleId >= 10) contentPrefix += " ";
				if (maxModuleId >= 100) contentPrefix += " ";
				if (maxModuleId >= 1000) contentPrefix += " ";
				for (const module of obj.modules) {
					colors.normal(prefix);
					const name = module.name || module.identifier;
					if (typeof module.id === "string" || typeof module.id === "number") {
						if (typeof module.id === "number") {
							if (module.id < 1000 && maxModuleId >= 1000) colors.normal(" ");
							if (module.id < 100 && maxModuleId >= 100) colors.normal(" ");
							if (module.id < 10 && maxModuleId >= 10) colors.normal(" ");
						} else {
							if (maxModuleId >= 1000) colors.normal(" ");
							if (maxModuleId >= 100) colors.normal(" ");
							if (maxModuleId >= 10) colors.normal(" ");
						}
						if (name !== module.id) {
							colors.normal("[");
							colors.normal(module.id);
							colors.normal("]");
							colors.normal(" ");
						} else {
							colors.normal("[");
							colors.bold(module.id);
							colors.normal("]");
						}
					}
					if (name !== module.id) {
						colors.bold(name);
					}
					processModuleAttributes(module);
					newline();
					processModuleContent(module, contentPrefix);
				}
				if (obj.filteredModules > 0) {
					colors.normal(prefix);
					colors.normal("   ");
					if (obj.modules.length > 0) colors.normal(" + ");
					colors.normal(obj.filteredModules);
					if (obj.modules.length > 0) colors.normal(" hidden");
					colors.normal(obj.filteredModules !== 1 ? " modules" : " module");
					newline();
				}
			}
		};

		if (obj.chunks) {
			for (const chunk of obj.chunks) {
				colors.normal("chunk ");
				if (chunk.id < 1000) colors.normal(" ");
				if (chunk.id < 100) colors.normal(" ");
				if (chunk.id < 10) colors.normal(" ");
				colors.normal("{");
				colors.yellow(chunk.id);
				colors.normal("} ");
				colors.green(chunk.files.join(", "));
				if (chunk.names && chunk.names.length > 0) {
					colors.normal(" (");
					colors.normal(chunk.names.join(", "));
					colors.normal(")");
				}
				colors.normal(" ");
				colors.normal(formatSize(chunk.size));
				for (const id of chunk.parents) {
					colors.normal(" <{");
					colors.yellow(id);
					colors.normal("}>");
				}
				for (const id of chunk.siblings) {
					colors.normal(" ={");
					colors.yellow(id);
					colors.normal("}=");
				}
				for (const id of chunk.children) {
					colors.normal(" >{");
					colors.yellow(id);
					colors.normal("}<");
				}
				if (chunk.childrenByOrder) {
					for (const name of Object.keys(chunk.childrenByOrder)) {
						const children = chunk.childrenByOrder[name];
						colors.normal(" ");
						colors.magenta(`(${name}:`);
						for (const id of children) {
							colors.normal(" {");
							colors.yellow(id);
							colors.normal("}");
						}
						colors.magenta(")");
					}
				}
				if (chunk.entry) {
					colors.yellow(" [entry]");
				} else if (chunk.initial) {
					colors.yellow(" [initial]");
				}
				if (chunk.rendered) {
					colors.green(" [rendered]");
				}
				if (chunk.recorded) {
					colors.green(" [recorded]");
				}
				if (chunk.reason) {
					colors.yellow(` ${chunk.reason}`);
				}
				newline();
				if (chunk.origins) {
					for (const origin of chunk.origins) {
						colors.normal("    > ");
						if (origin.request) {
							colors.normal(origin.request);
							colors.normal(" ");
						}
						if (origin.module) {
							colors.normal("[");
							colors.normal(origin.moduleId);
							colors.normal("] ");
							const module = modulesByIdentifier[`$${origin.module}`];
							if (module) {
								colors.bold(module.name);
								colors.normal(" ");
							}
						}
						if (origin.loc) {
							colors.normal(origin.loc);
						}
						newline();
					}
				}
				processModulesList(chunk, " ");
			}
		}

		processModulesList(obj, "");

		if (obj._showWarnings && obj.warnings) {
			for (const warning of obj.warnings) {
				newline();
				colors.yellow(`WARNING in ${warning}`);
				newline();
			}
		}
		if (obj._showErrors && obj.errors) {
			for (const error of obj.errors) {
				newline();
				colors.red(`ERROR in ${error}`);
				newline();
			}
		}
		if (obj.children) {
			for (const child of obj.children) {
				const childString = Stats.jsonToString(child, useColors);
				if (childString) {
					if (child.name) {
						colors.normal("Child ");
						colors.bold(child.name);
						colors.normal(":");
					} else {
						colors.normal("Child");
					}
					newline();
					buf.push("    ");
					buf.push(childString.replace(/\n/g, "\n    "));
					newline();
				}
			}
		}
		if (obj.needAdditionalPass) {
			colors.yellow(
				"Compilation needs an additional pass and will compile again."
			);
		}

		while (buf[buf.length - 1] === "\n") {
			buf.pop();
		}
		return buf.join("");
	}

	static presetToOptions(name) {
		// Accepted values: none, errors-only, minimal, normal, detailed, verbose
		// Any other falsy value will behave as 'none', truthy values as 'normal'
		const pn =
			(typeof name === "string" && name.toLowerCase()) || name || "none";
		switch (pn) {
			case "none":
				return {
					all: false
				};
			case "verbose":
				return {
					entrypoints: true,
					chunkGroups: true,
					modules: false,
					chunks: true,
					chunkModules: true,
					chunkOrigins: true,
					depth: true,
					env: true,
					reasons: true,
					usedExports: true,
					providedExports: true,
					optimizationBailout: true,
					errorDetails: true,
					publicPath: true,
					exclude: false,
					maxModules: Infinity
				};
			case "detailed":
				return {
					entrypoints: true,
					chunkGroups: true,
					chunks: true,
					chunkModules: false,
					chunkOrigins: true,
					depth: true,
					usedExports: true,
					providedExports: true,
					optimizationBailout: true,
					errorDetails: true,
					publicPath: true,
					exclude: false,
					maxModules: Infinity
				};
			case "minimal":
				return {
					all: false,
					modules: true,
					maxModules: 0,
					errors: true,
					warnings: true
				};
			case "errors-only":
				return {
					all: false,
					errors: true,
					moduleTrace: true
				};
			default:
				return {};
		}
	}

	static getChildOptions(options, idx) {
		let innerOptions;
		if (Array.isArray(options.children)) {
			if (idx < options.children.length) {
				innerOptions = options.children[idx];
			}
		} else if (typeof options.children === "object" && options.children) {
			innerOptions = options.children;
		}
		if (typeof innerOptions === "boolean" || typeof innerOptions === "string") {
			innerOptions = Stats.presetToOptions(innerOptions);
		}
		if (!innerOptions) {
			return options;
		}
		const childOptions = Object.assign({}, options);
		delete childOptions.children; // do not inherit children
		return Object.assign(childOptions, innerOptions);
	}
}

module.exports = Stats;
