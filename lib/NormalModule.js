/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const parseJson = require("json-parse-better-errors");
const { getContext, runLoaders } = require("loader-runner");
const querystring = require("querystring");
const { validate } = require("schema-utils");
const { HookMap, SyncHook, AsyncSeriesBailHook } = require("tapable");
const {
	CachedSource,
	OriginalSource,
	RawSource,
	SourceMapSource
} = require("webpack-sources");
const Compilation = require("./Compilation");
const Module = require("./Module");
const ModuleBuildError = require("./ModuleBuildError");
const ModuleError = require("./ModuleError");
const ModuleGraphConnection = require("./ModuleGraphConnection");
const ModuleParseError = require("./ModuleParseError");
const ModuleWarning = require("./ModuleWarning");
const RuntimeGlobals = require("./RuntimeGlobals");
const UnhandledSchemeError = require("./UnhandledSchemeError");
const WebpackError = require("./WebpackError");
const LazySet = require("./util/LazySet");
const { getScheme } = require("./util/URLAbsoluteSpecifier");
const {
	compareLocations,
	concatComparators,
	compareSelect,
	keepOriginalOrder
} = require("./util/comparators");
const createHash = require("./util/createHash");
const { contextify } = require("./util/identifier");
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("source-map").RawSourceMap} SourceMap */
/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../declarations/WebpackOptions").WebpackOptionsNormalized} WebpackOptions */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Generator")} Generator */
/** @typedef {import("./Module").CodeGenerationContext} CodeGenerationContext */
/** @typedef {import("./Module").CodeGenerationResult} CodeGenerationResult */
/** @typedef {import("./Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./ModuleGraph")} ModuleGraph */
/** @typedef {import("./ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("./Parser")} Parser */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/Hash")} Hash */
/** @typedef {import("./util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("./util/runtime").RuntimeSpec} RuntimeSpec */

/**
 * @typedef {Object} LoaderItem
 * @property {string} loader
 * @property {any} options
 * @property {string?} ident
 * @property {string?} type
 */

/**
 * @param {string} context absolute context path
 * @param {string} source a source path
 * @param {Object=} associatedObjectForCache an object to which the cache will be attached
 * @returns {string} new source path
 */
const contextifySourceUrl = (context, source, associatedObjectForCache) => {
	if (source.startsWith("webpack://")) return source;
	return `webpack://${contextify(context, source, associatedObjectForCache)}`;
};

/**
 * @param {string} context absolute context path
 * @param {SourceMap} sourceMap a source map
 * @param {Object=} associatedObjectForCache an object to which the cache will be attached
 * @returns {SourceMap} new source map
 */
const contextifySourceMap = (context, sourceMap, associatedObjectForCache) => {
	if (!Array.isArray(sourceMap.sources)) return sourceMap;
	const { sourceRoot } = sourceMap;
	/** @type {function(string): string} */
	const mapper = !sourceRoot
		? source => source
		: sourceRoot.endsWith("/")
		? source =>
				source.startsWith("/")
					? `${sourceRoot.slice(0, -1)}${source}`
					: `${sourceRoot}${source}`
		: source =>
				source.startsWith("/")
					? `${sourceRoot}${source}`
					: `${sourceRoot}/${source}`;
	const newSources = sourceMap.sources.map(source =>
		contextifySourceUrl(context, mapper(source), associatedObjectForCache)
	);
	return {
		...sourceMap,
		file: "x",
		sourceRoot: undefined,
		sources: newSources
	};
};

/**
 * @param {string | Buffer} input the input
 * @returns {string} the converted string
 */
const asString = input => {
	if (Buffer.isBuffer(input)) {
		return input.toString("utf-8");
	}
	return input;
};

/**
 * @param {string | Buffer} input the input
 * @returns {Buffer} the converted buffer
 */
const asBuffer = input => {
	if (!Buffer.isBuffer(input)) {
		return Buffer.from(input, "utf-8");
	}
	return input;
};

class NonErrorEmittedError extends WebpackError {
	constructor(error) {
		super();

		this.name = "NonErrorEmittedError";
		this.message = "(Emitted value instead of an instance of Error) " + error;

		Error.captureStackTrace(this, this.constructor);
	}
}

makeSerializable(
	NonErrorEmittedError,
	"webpack/lib/NormalModule",
	"NonErrorEmittedError"
);

/**
 * @typedef {Object} NormalModuleCompilationHooks
 * @property {SyncHook<[object, NormalModule]>} loader
 * @property {SyncHook<[LoaderItem[], object, NormalModule]>} beforeLoaders
 * @property {HookMap<AsyncSeriesBailHook<[string, NormalModule], string | Buffer>>} readResourceForScheme
 */

/** @type {WeakMap<Compilation, NormalModuleCompilationHooks>} */
const compilationHooksMap = new WeakMap();

class NormalModule extends Module {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {NormalModuleCompilationHooks} the attached hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				loader: new SyncHook(["loaderContext", "module"]),
				beforeLoaders: new SyncHook(["loaders", "module", "loaderContext"]),
				readResourceForScheme: new HookMap(
					() => new AsyncSeriesBailHook(["resource", "module"])
				)
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {Object} options options object
	 * @param {string} options.type module type
	 * @param {string} options.request request string
	 * @param {string} options.userRequest request intended by user (without loaders from config)
	 * @param {string} options.rawRequest request without resolving
	 * @param {LoaderItem[]} options.loaders list of loaders
	 * @param {string} options.resource path + query of the real resource
	 * @param {string | undefined} options.matchResource path + query of the matched resource (virtual)
	 * @param {Parser} options.parser the parser used
	 * @param {Generator} options.generator the generator used
	 * @param {Object} options.resolveOptions options used for resolving requests from this module
	 */
	constructor({
		type,
		request,
		userRequest,
		rawRequest,
		loaders,
		resource,
		matchResource,
		parser,
		generator,
		resolveOptions
	}) {
		super(type, getContext(resource));

		// Info from Factory
		/** @type {string} */
		this.request = request;
		/** @type {string} */
		this.userRequest = userRequest;
		/** @type {string} */
		this.rawRequest = rawRequest;
		/** @type {boolean} */
		this.binary = /^(asset|webassembly)\b/.test(type);
		/** @type {Parser} */
		this.parser = parser;
		/** @type {Generator} */
		this.generator = generator;
		/** @type {string} */
		this.resource = resource;
		/** @type {string | undefined} */
		this.matchResource = matchResource;
		/** @type {LoaderItem[]} */
		this.loaders = loaders;
		if (resolveOptions !== undefined) {
			// already declared in super class
			this.resolveOptions = resolveOptions;
		}

		// Info from Build
		/** @type {WebpackError=} */
		this.error = null;
		/** @private @type {Source=} */
		this._source = null;
		/** @private @type {Map<string, number> | undefined} **/
		this._sourceSizes = undefined;

		// Cache
		this._lastSuccessfulBuildMeta = {};
		this._forceBuild = true;
		this._isEvaluatingSideEffects = false;

		// TODO refactor this -> options object filled from Factory
		this.useSourceMap = false;
	}

	/**
	 * @returns {string} a unique identifier of the module
	 */
	identifier() {
		return this.request;
	}

	/**
	 * @param {RequestShortener} requestShortener the request shortener
	 * @returns {string} a user readable identifier of the module
	 */
	readableIdentifier(requestShortener) {
		return requestShortener.shorten(this.userRequest);
	}

	/**
	 * @param {LibIdentOptions} options options
	 * @returns {string | null} an identifier for library inclusion
	 */
	libIdent(options) {
		return contextify(
			options.context,
			this.userRequest,
			options.associatedObjectForCache
		);
	}

	/**
	 * @returns {string | null} absolute path which should be used for condition matching (usually the resource path)
	 */
	nameForCondition() {
		const resource = this.matchResource || this.resource;
		const idx = resource.indexOf("?");
		if (idx >= 0) return resource.substr(0, idx);
		return resource;
	}

	/**
	 * Assuming this module is in the cache. Update the (cached) module with
	 * the fresh module from the factory. Usually updates internal references
	 * and properties.
	 * @param {Module} module fresh module
	 * @returns {void}
	 */
	updateCacheModule(module) {
		super.updateCacheModule(module);
		const m = /** @type {NormalModule} */ (module);
		this.binary = m.binary;
		this.request = m.request;
		this.userRequest = m.userRequest;
		this.rawRequest = m.rawRequest;
		this.parser = m.parser;
		this.generator = m.generator;
		this.resource = m.resource;
		this.matchResource = m.matchResource;
		this.loaders = m.loaders;
	}

	/**
	 * @param {string} context the compilation context
	 * @param {string} name the asset name
	 * @param {string} content the content
	 * @param {string | TODO} sourceMap an optional source map
	 * @param {Object=} associatedObjectForCache object for caching
	 * @returns {Source} the created source
	 */
	createSourceForAsset(
		context,
		name,
		content,
		sourceMap,
		associatedObjectForCache
	) {
		if (!sourceMap) {
			return new RawSource(content);
		}

		if (typeof sourceMap === "string") {
			return new OriginalSource(
				content,
				contextifySourceUrl(context, sourceMap, associatedObjectForCache)
			);
		}

		return new SourceMapSource(
			content,
			name,
			contextifySourceMap(context, sourceMap, associatedObjectForCache)
		);
	}

	/**
	 * @param {ResolverWithOptions} resolver a resolver
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {InputFileSystem} fs file system from reading
	 * @returns {any} loader context
	 */
	createLoaderContext(resolver, options, compilation, fs) {
		const { requestShortener } = compilation.runtimeTemplate;
		const getCurrentLoaderName = () => {
			const currentLoader = this.getCurrentLoader(loaderContext);
			if (!currentLoader) return "(not in loader scope)";
			return requestShortener.shorten(currentLoader.loader);
		};
		const getResolveContext = () => {
			return {
				fileDependencies: {
					add: d => loaderContext.addDependency(d)
				},
				contextDependencies: {
					add: d => loaderContext.addContextDependency(d)
				},
				missingDependencies: {
					add: d => loaderContext.addMissingDependency(d)
				}
			};
		};
		const loaderContext = {
			version: 2,
			getOptions: schema => {
				const loader = this.getCurrentLoader(loaderContext);

				let { options } = loader;

				if (typeof options === "string") {
					if (options.substr(0, 1) === "{" && options.substr(-1) === "}") {
						try {
							options = parseJson(options);
						} catch (e) {
							throw new Error(`Cannot parse string options: ${e.message}`);
						}
					} else {
						options = querystring.parse(options, "&", "=", {
							maxKeys: 0
						});
					}
				}

				if (options === null || options === undefined) {
					options = {};
				}

				if (schema) {
					let name = "Loader";
					let baseDataPath = "options";
					let match;
					if (schema.title && (match = /^(.+) (.+)$/.exec(schema.title))) {
						[, name, baseDataPath] = match;
					}
					validate(schema, options, {
						name,
						baseDataPath
					});
				}

				return options;
			},
			emitWarning: warning => {
				if (!(warning instanceof Error)) {
					warning = new NonErrorEmittedError(warning);
				}
				this.addWarning(
					new ModuleWarning(warning, {
						from: getCurrentLoaderName()
					})
				);
			},
			emitError: error => {
				if (!(error instanceof Error)) {
					error = new NonErrorEmittedError(error);
				}
				this.addError(
					new ModuleError(error, {
						from: getCurrentLoaderName()
					})
				);
			},
			getLogger: name => {
				const currentLoader = this.getCurrentLoader(loaderContext);
				return compilation.getLogger(() =>
					[currentLoader && currentLoader.loader, name, this.identifier()]
						.filter(Boolean)
						.join("|")
				);
			},
			resolve(context, request, callback) {
				resolver.resolve({}, context, request, getResolveContext(), callback);
			},
			getResolve(options) {
				const child = options ? resolver.withOptions(options) : resolver;
				return (context, request, callback) => {
					if (callback) {
						child.resolve({}, context, request, getResolveContext(), callback);
					} else {
						return new Promise((resolve, reject) => {
							child.resolve(
								{},
								context,
								request,
								getResolveContext(),
								(err, result) => {
									if (err) reject(err);
									else resolve(result);
								}
							);
						});
					}
				};
			},
			emitFile: (name, content, sourceMap, assetInfo) => {
				if (!this.buildInfo.assets) {
					this.buildInfo.assets = Object.create(null);
					this.buildInfo.assetsInfo = new Map();
				}
				this.buildInfo.assets[name] = this.createSourceForAsset(
					options.context,
					name,
					content,
					sourceMap,
					compilation.compiler.root
				);
				this.buildInfo.assetsInfo.set(name, assetInfo);
			},
			addBuildDependency: dep => {
				if (this.buildInfo.buildDependencies === undefined) {
					this.buildInfo.buildDependencies = new LazySet();
				}
				this.buildInfo.buildDependencies.add(dep);
			},
			rootContext: options.context,
			webpack: true,
			sourceMap: !!this.useSourceMap,
			mode: options.mode || "production",
			_module: this,
			_compilation: compilation,
			_compiler: compilation.compiler,
			fs: fs
		};

		Object.assign(loaderContext, options.loader);

		NormalModule.getCompilationHooks(compilation).loader.call(
			loaderContext,
			this
		);

		return loaderContext;
	}

	getCurrentLoader(loaderContext, index = loaderContext.loaderIndex) {
		if (
			this.loaders &&
			this.loaders.length &&
			index < this.loaders.length &&
			index >= 0 &&
			this.loaders[index]
		) {
			return this.loaders[index];
		}
		return null;
	}

	/**
	 * @param {string} context the compilation context
	 * @param {string | Buffer} content the content
	 * @param {string | TODO} sourceMap an optional source map
	 * @param {Object=} associatedObjectForCache object for caching
	 * @returns {Source} the created source
	 */
	createSource(context, content, sourceMap, associatedObjectForCache) {
		if (Buffer.isBuffer(content)) {
			return new RawSource(content);
		}

		// if there is no identifier return raw source
		if (!this.identifier) {
			return new RawSource(content);
		}

		// from here on we assume we have an identifier
		const identifier = this.identifier();

		if (this.useSourceMap && sourceMap) {
			return new SourceMapSource(
				content,
				contextifySourceUrl(context, identifier, associatedObjectForCache),
				contextifySourceMap(context, sourceMap, associatedObjectForCache)
			);
		}

		return new OriginalSource(
			content,
			contextifySourceUrl(context, identifier, associatedObjectForCache)
		);
	}

	/**
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	doBuild(options, compilation, resolver, fs, callback) {
		const loaderContext = this.createLoaderContext(
			resolver,
			options,
			compilation,
			fs
		);

		const processResult = (err, result) => {
			if (err) {
				if (!(err instanceof Error)) {
					err = new NonErrorEmittedError(err);
				}
				const currentLoader = this.getCurrentLoader(loaderContext);
				const error = new ModuleBuildError(err, {
					from:
						currentLoader &&
						compilation.runtimeTemplate.requestShortener.shorten(
							currentLoader.loader
						)
				});
				return callback(error);
			}

			const source = result[0];
			const sourceMap = result.length >= 1 ? result[1] : null;
			const extraInfo = result.length >= 2 ? result[2] : null;

			if (!Buffer.isBuffer(source) && typeof source !== "string") {
				const currentLoader = this.getCurrentLoader(loaderContext, 0);
				const err = new Error(
					`Final loader (${
						currentLoader
							? compilation.runtimeTemplate.requestShortener.shorten(
									currentLoader.loader
							  )
							: "unknown"
					}) didn't return a Buffer or String`
				);
				const error = new ModuleBuildError(err);
				return callback(error);
			}

			this._source = this.createSource(
				options.context,
				this.binary ? asBuffer(source) : asString(source),
				sourceMap,
				compilation.compiler.root
			);
			if (this._sourceSizes !== undefined) this._sourceSizes.clear();
			this._ast =
				typeof extraInfo === "object" &&
				extraInfo !== null &&
				extraInfo.webpackAST !== undefined
					? extraInfo.webpackAST
					: null;
			return callback();
		};

		const hooks = NormalModule.getCompilationHooks(compilation);

		hooks.beforeLoaders.call(this.loaders, this, loaderContext);
		runLoaders(
			{
				resource: this.resource,
				loaders: this.loaders,
				context: loaderContext,
				readResource: (resource, callback) => {
					const scheme = getScheme(resource);
					if (scheme) {
						hooks.readResourceForScheme
							.for(scheme)
							.callAsync(resource, this, (err, result) => {
								if (err) return callback(err);
								if (typeof result !== "string" && !result) {
									return callback(new UnhandledSchemeError(scheme, resource));
								}
								return callback(null, result);
							});
					} else {
						fs.readFile(resource, callback);
					}
				}
			},
			(err, result) => {
				if (!result) {
					processResult(
						err || new Error("No result from loader-runner processing"),
						null
					);
				}
				this.buildInfo.fileDependencies = new LazySet();
				this.buildInfo.fileDependencies.addAll(result.fileDependencies);
				this.buildInfo.contextDependencies = new LazySet();
				this.buildInfo.contextDependencies.addAll(result.contextDependencies);
				this.buildInfo.missingDependencies = new LazySet();
				this.buildInfo.missingDependencies.addAll(result.missingDependencies);
				if (
					this.loaders.length > 0 &&
					this.buildInfo.buildDependencies === undefined
				) {
					this.buildInfo.buildDependencies = new LazySet();
				}
				for (const loader of this.loaders) {
					this.buildInfo.buildDependencies.add(loader.loader);
				}
				this.buildInfo.cacheable = result.cacheable;
				processResult(err, result.result);
			}
		);
	}

	/**
	 * @param {WebpackError} error the error
	 * @returns {void}
	 */
	markModuleAsErrored(error) {
		// Restore build meta from successful build to keep importing state
		this.buildMeta = { ...this._lastSuccessfulBuildMeta };
		this.error = error;
		this.addError(error);
	}

	applyNoParseRule(rule, content) {
		// must start with "rule" if rule is a string
		if (typeof rule === "string") {
			return content.startsWith(rule);
		}

		if (typeof rule === "function") {
			return rule(content);
		}
		// we assume rule is a regexp
		return rule.test(content);
	}

	// check if module should not be parsed
	// returns "true" if the module should !not! be parsed
	// returns "false" if the module !must! be parsed
	shouldPreventParsing(noParseRule, request) {
		// if no noParseRule exists, return false
		// the module !must! be parsed.
		if (!noParseRule) {
			return false;
		}

		// we only have one rule to check
		if (!Array.isArray(noParseRule)) {
			// returns "true" if the module is !not! to be parsed
			return this.applyNoParseRule(noParseRule, request);
		}

		for (let i = 0; i < noParseRule.length; i++) {
			const rule = noParseRule[i];
			// early exit on first truthy match
			// this module is !not! to be parsed
			if (this.applyNoParseRule(rule, request)) {
				return true;
			}
		}
		// no match found, so this module !should! be parsed
		return false;
	}

	_initBuildHash(compilation) {
		const hash = createHash(compilation.outputOptions.hashFunction);
		if (this._source) {
			hash.update("source");
			this._source.updateHash(hash);
		}
		hash.update("meta");
		hash.update(JSON.stringify(this.buildMeta));
		this.buildInfo.hash = /** @type {string} */ (hash.digest("hex"));
	}

	/**
	 * @param {WebpackOptions} options webpack options
	 * @param {Compilation} compilation the compilation
	 * @param {ResolverWithOptions} resolver the resolver
	 * @param {InputFileSystem} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this._forceBuild = false;
		this._source = null;
		if (this._sourceSizes !== undefined) this._sourceSizes.clear();
		this._ast = null;
		this.error = null;
		this.clearWarningsAndErrors();
		this.clearDependenciesAndBlocks();
		this.buildMeta = {};
		this.buildInfo = {
			cacheable: false,
			parsed: true,
			fileDependencies: undefined,
			contextDependencies: undefined,
			missingDependencies: undefined,
			buildDependencies: undefined,
			hash: undefined,
			assets: undefined,
			assetsInfo: undefined
		};

		const startTime = Date.now();

		return this.doBuild(options, compilation, resolver, fs, err => {
			// if we have an error mark module as failed and exit
			if (err) {
				this.markModuleAsErrored(err);
				this._initBuildHash(compilation);
				return callback();
			}

			const handleParseError = e => {
				const source = this._source.source();
				const loaders = this.loaders.map(item =>
					contextify(options.context, item.loader, compilation.compiler.root)
				);
				const error = new ModuleParseError(source, e, loaders, this.type);
				this.markModuleAsErrored(error);
				this._initBuildHash(compilation);
				return callback();
			};

			const handleParseResult = result => {
				this.dependencies.sort(
					concatComparators(
						compareSelect(a => a.loc, compareLocations),
						keepOriginalOrder(this.dependencies)
					)
				);
				this._initBuildHash(compilation);
				this._lastSuccessfulBuildMeta = this.buildMeta;
				return handleBuildDone();
			};

			const handleBuildDone = () => {
				const snapshotOptions = compilation.options.snapshot.module;
				if (!this.buildInfo.cacheable || !snapshotOptions) {
					return callback();
				}
				// convert file/context/missingDependencies into filesystem snapshot
				compilation.fileSystemInfo.createSnapshot(
					startTime,
					this.buildInfo.fileDependencies,
					this.buildInfo.contextDependencies,
					this.buildInfo.missingDependencies,
					snapshotOptions,
					(err, snapshot) => {
						if (err) {
							this.markModuleAsErrored(err);
							return;
						}
						this.buildInfo.fileDependencies = undefined;
						this.buildInfo.contextDependencies = undefined;
						this.buildInfo.missingDependencies = undefined;
						this.buildInfo.snapshot = snapshot;
						return callback();
					}
				);
			};

			// check if this module should !not! be parsed.
			// if so, exit here;
			const noParseRule = options.module && options.module.noParse;
			if (this.shouldPreventParsing(noParseRule, this.request)) {
				// We assume that we need module and exports
				this.buildInfo.parsed = false;
				this._initBuildHash(compilation);
				return handleBuildDone();
			}

			let result;
			try {
				result = this.parser.parse(this._ast || this._source.source(), {
					current: this,
					module: this,
					compilation: compilation,
					options: options
				});
			} catch (e) {
				handleParseError(e);
				return;
			}
			handleParseResult(result);
		});
	}

	/**
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(context) {
		return this.generator.getConcatenationBailoutReason(this, context);
	}

	/**
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this module should be connected to referencing modules when consumed for side-effects only
	 */
	getSideEffectsConnectionState(moduleGraph) {
		if (this.factoryMeta !== undefined && this.factoryMeta.sideEffectFree)
			return false;
		if (this.buildMeta !== undefined && this.buildMeta.sideEffectFree) {
			if (this._isEvaluatingSideEffects)
				return ModuleGraphConnection.CIRCULAR_CONNECTION;
			this._isEvaluatingSideEffects = true;
			/** @type {ConnectionState} */
			let current = false;
			for (const dep of this.dependencies) {
				const state = dep.getModuleEvaluationSideEffectsState(moduleGraph);
				if (state === true) {
					this._isEvaluatingSideEffects = false;
					return true;
				} else if (state !== ModuleGraphConnection.CIRCULAR_CONNECTION) {
					current = ModuleGraphConnection.addConnectionStates(current, state);
				}
			}
			this._isEvaluatingSideEffects = false;
			// When caching is implemented here, make sure to not cache when
			// at least one circular connection was in the loop above
			return current;
		} else {
			return true;
		}
	}

	/**
	 * @returns {Set<string>} types available (do not mutate)
	 */
	getSourceTypes() {
		return this.generator.getTypes(this);
	}

	/**
	 * @param {CodeGenerationContext} context context for code generation
	 * @returns {CodeGenerationResult} result
	 */
	codeGeneration({
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		runtime,
		concatenationScope
	}) {
		/** @type {Set<string>} */
		const runtimeRequirements = new Set();

		if (!this.buildInfo.parsed) {
			runtimeRequirements.add(RuntimeGlobals.module);
			runtimeRequirements.add(RuntimeGlobals.exports);
			runtimeRequirements.add(RuntimeGlobals.thisAsExports);
		}

		const sources = new Map();
		for (const type of this.generator.getTypes(this)) {
			const source = this.error
				? new RawSource(
						"throw new Error(" + JSON.stringify(this.error.message) + ");"
				  )
				: this.generator.generate(this, {
						dependencyTemplates,
						runtimeTemplate,
						moduleGraph,
						chunkGraph,
						runtimeRequirements,
						runtime,
						concatenationScope,
						type
				  });

			if (source) {
				sources.set(type, new CachedSource(source));
			}
		}

		/** @type {CodeGenerationResult} */
		const resultEntry = {
			sources,
			runtimeRequirements
		};
		return resultEntry;
	}

	/**
	 * @returns {Source | null} the original source for the module before webpack transformation
	 */
	originalSource() {
		return this._source;
	}

	/**
	 * @returns {void}
	 */
	invalidateBuild() {
		this._forceBuild = true;
	}

	/**
	 * @param {NeedBuildContext} context context info
	 * @param {function(WebpackError=, boolean=): void} callback callback function, returns true, if the module needs a rebuild
	 * @returns {void}
	 */
	needBuild({ fileSystemInfo }, callback) {
		// build if enforced
		if (this._forceBuild) return callback(null, true);

		// always try to build in case of an error
		if (this.error) return callback(null, true);

		// always build when module is not cacheable
		if (!this.buildInfo.cacheable) return callback(null, true);

		// build when there is no snapshot to check
		if (!this.buildInfo.snapshot) return callback(null, true);

		// check snapshot for validity
		fileSystemInfo.checkSnapshotValid(this.buildInfo.snapshot, (err, valid) => {
			callback(err, !valid);
		});
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module (must be non-zero)
	 */
	size(type) {
		const cachedSize =
			this._sourceSizes === undefined ? undefined : this._sourceSizes.get(type);
		if (cachedSize !== undefined) {
			return cachedSize;
		}
		const size = Math.max(1, this.generator.getSize(this, type));
		if (this._sourceSizes === undefined) {
			this._sourceSizes = new Map();
		}
		this._sourceSizes.set(type, size);
		return size;
	}

	/**
	 * @param {LazySet<string>} fileDependencies set where file dependencies are added to
	 * @param {LazySet<string>} contextDependencies set where context dependencies are added to
	 * @param {LazySet<string>} missingDependencies set where missing dependencies are added to
	 * @param {LazySet<string>} buildDependencies set where build dependencies are added to
	 */
	addCacheDependencies(
		fileDependencies,
		contextDependencies,
		missingDependencies,
		buildDependencies
	) {
		const { snapshot, buildDependencies: buildDeps } = this.buildInfo;
		if (snapshot) {
			fileDependencies.addAll(snapshot.getFileIterable());
			contextDependencies.addAll(snapshot.getContextIterable());
			missingDependencies.addAll(snapshot.getMissingIterable());
		} else {
			const {
				fileDependencies: fileDeps,
				contextDependencies: contextDeps,
				missingDependencies: missingDeps
			} = this.buildInfo;
			if (fileDeps !== undefined) fileDependencies.addAll(fileDeps);
			if (contextDeps !== undefined) contextDependencies.addAll(contextDeps);
			if (missingDeps !== undefined) missingDependencies.addAll(missingDeps);
		}
		if (buildDeps !== undefined) {
			buildDependencies.addAll(buildDeps);
		}
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		hash.update(this.buildInfo.hash);
		this.generator.updateHash(hash, {
			module: this,
			...context
		});
		super.updateHash(hash, context);
	}

	serialize(context) {
		const { write } = context;
		// deserialize
		write(this._source);
		write(this._sourceSizes);
		write(this.error);
		write(this._lastSuccessfulBuildMeta);
		write(this._forceBuild);
		super.serialize(context);
	}

	static deserialize(context) {
		const obj = new NormalModule({
			// will be filled by updateCacheModule
			type: "",
			resource: "",
			request: null,
			userRequest: null,
			rawRequest: null,
			loaders: null,
			matchResource: null,
			parser: null,
			generator: null,
			resolveOptions: null
		});
		obj.deserialize(context);
		return obj;
	}

	deserialize(context) {
		const { read } = context;
		this._source = read();
		this._sourceSizes = read();
		this.error = read();
		this._lastSuccessfulBuildMeta = read();
		this._forceBuild = read();
		super.deserialize(context);
	}
}

makeSerializable(NormalModule, "webpack/lib/NormalModule");

module.exports = NormalModule;
