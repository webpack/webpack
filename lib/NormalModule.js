/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { getContext, runLoaders } = require("loader-runner");
const { SyncHook } = require("tapable");
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
const ModuleParseError = require("./ModuleParseError");
const ModuleWarning = require("./ModuleWarning");
const RuntimeGlobals = require("./RuntimeGlobals");
const WebpackError = require("./WebpackError");
const {
	compareLocations,
	concatComparators,
	compareSelect,
	keepOriginalOrder
} = require("./util/comparators");
const createHash = require("./util/createHash");
const contextify = require("./util/identifier").contextify;
const makeSerializable = require("./util/makeSerializable");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("./ChunkGraph")} ChunkGraph */
/** @typedef {import("./Compilation")} Compilation */
/** @typedef {import("./DependencyTemplates")} DependencyTemplates */
/** @typedef {import("./Module").LibIdentOptions} LibIdentOptions */
/** @typedef {import("./Module").NeedBuildContext} NeedBuildContext */
/** @typedef {import("./Module").SourceContext} SourceContext */
/** @typedef {import("./RequestShortener")} RequestShortener */
/** @typedef {import("./RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("./util/createHash").Hash} Hash */

/**
 * @typedef {Object} ParserState
 * @property {NormalModule} current
 * @property {NormalModule} module
 * @property {Compilation} compilation
 * @property {TODO} options
 */

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
 * @typedef {Object} CachedSourceEntry
 * @property {string} hash the hash value
 */

/**
 * @typedef {Object} NormalModuleCompilationHooks
 * @property {SyncHook<object, NormalModule>} loader
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
				loader: new SyncHook(["loaderContext", "module"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

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
		this.binary = type.startsWith("webassembly");
		this.parser = parser;
		this.generator = generator;
		this.resource = resource;
		this.matchResource = matchResource;
		this.loaders = loaders;
		if (resolveOptions !== undefined) {
			this.resolveOptions = resolveOptions;
		}

		// Info from Build
		/** @type {WebpackError=} */
		this.error = null;
		/** @private @type {Source=} */
		this._source = null;
		/** @private @type {Map<string, GenerateSourceResult & CachedSourceEntry>} */
		this._cachedSources = new Map();

		// Cache
		this._lastSuccessfulBuildMeta = {};
		this._forceBuild = true;

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
		return contextify(options.context, this.userRequest);
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
	 * @param {string} name the asset name
	 * @param {string} content the content
	 * @param {string | TODO} sourceMap an optional source map
	 * @returns {Source} the created source
	 */
	createSourceForAsset(name, content, sourceMap) {
		if (!sourceMap) {
			return new RawSource(content);
		}

		if (typeof sourceMap === "string") {
			return new OriginalSource(content, sourceMap);
		}

		return new SourceMapSource(content, name, sourceMap);
	}

	createLoaderContext(resolver, options, compilation, fs) {
		const requestShortener = compilation.runtimeTemplate.requestShortener;
		const loaderContext = {
			version: 2,
			emitWarning: warning => {
				if (!(warning instanceof Error)) {
					warning = new NonErrorEmittedError(warning);
				}
				const currentLoader = this.getCurrentLoader(loaderContext);
				this.warnings.push(
					new ModuleWarning(warning, {
						from: requestShortener.shorten(currentLoader.loader)
					})
				);
			},
			emitError: error => {
				if (!(error instanceof Error)) {
					error = new NonErrorEmittedError(error);
				}
				const currentLoader = this.getCurrentLoader(loaderContext);
				this.errors.push(
					new ModuleError(error, {
						from: requestShortener.shorten(currentLoader.loader)
					})
				);
			},
			resolve(context, request, callback) {
				resolver.resolve({}, context, request, {}, callback);
			},
			getResolve(options) {
				const child = options ? resolver.withOptions(options) : resolver;
				return (context, request, callback) => {
					if (callback) {
						child.resolve({}, context, request, {}, callback);
					} else {
						return new Promise((resolve, reject) => {
							child.resolve({}, context, request, {}, (err, result) => {
								if (err) reject(err);
								else resolve(result);
							});
						});
					}
				};
			},
			emitFile: (name, content, sourceMap) => {
				if (!this.buildInfo.assets) {
					this.buildInfo.assets = Object.create(null);
				}
				this.buildInfo.assets[name] = this.createSourceForAsset(
					name,
					content,
					sourceMap
				);
			},
			rootContext: options.context,
			webpack: true,
			sourceMap: !!this.useSourceMap,
			_module: this,
			_compilation: compilation,
			_compiler: compilation.compiler,
			fs: fs
		};

		NormalModule.getCompilationHooks(compilation).loader.call(
			loaderContext,
			this
		);

		if (options.loader) {
			Object.assign(loaderContext, options.loader);
		}

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
	 * @param {string | Buffer} content the content
	 * @param {string | TODO} sourceMap an optional source map
	 * @returns {Source} the created source
	 */
	createSource(content, sourceMap) {
		if (Buffer.isBuffer(content)) {
			// @ts-ignore
			// TODO We need to fix @types/webpack-sources to allow RawSource to take a Buffer | string
			return new RawSource(content);
		}

		// if there is no identifier return raw source
		if (!this.identifier) {
			return new RawSource(content);
		}

		// from here on we assume we have an identifier
		const identifier = this.identifier();

		if (this.useSourceMap && sourceMap) {
			return new SourceMapSource(content, identifier, sourceMap);
		}

		return new OriginalSource(content, identifier);
	}

	doBuild(options, compilation, resolver, fs, callback) {
		const loaderContext = this.createLoaderContext(
			resolver,
			options,
			compilation,
			fs
		);

		const startTime = Date.now();

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
				this.binary ? asBuffer(source) : asString(source),
				sourceMap
			);
			this._ast =
				typeof extraInfo === "object" &&
				extraInfo !== null &&
				extraInfo.webpackAST !== undefined
					? extraInfo.webpackAST
					: null;
			return callback();
		};

		runLoaders(
			{
				resource: this.resource,
				loaders: this.loaders,
				context: loaderContext,
				readResource: fs.readFile.bind(fs)
			},
			(err, result) => {
				if (!result) {
					processResult(
						err || new Error("No result from loader-runner processing"),
						null
					);
				}
				this.buildInfo.fileDependencies = new Set(result.fileDependencies);
				this.buildInfo.contextDependencies = new Set(
					result.contextDependencies
				);
				this.buildInfo.missingDependencies = new Set(
					result.missingDependencies
				);
				if (!result.cacheable) {
					this.buildInfo.cacheable = false;
					processResult(err, result.result);
					return;
				}
				this.buildInfo.cacheable = true;
				compilation.fileSystemInfo.createSnapshot(
					startTime,
					result.fileDependencies,
					result.contextDependencies,
					result.missingDependencies,
					null,
					(err2, snapshot) => {
						this.buildInfo.snapshot = snapshot;
						processResult(err || err2, result.result);
					}
				);
			}
		);
	}

	/**
	 * @param {WebpackError} error the error
	 * @returns {void}
	 */
	markModuleAsErrored(error) {
		// Restore build meta from successful build to keep importing state
		this.buildMeta = Object.assign({}, this._lastSuccessfulBuildMeta);

		this.error = error;
		this.errors.push(error);
		this._source = new RawSource(
			"throw new Error(" + JSON.stringify(this.error.message) + ");"
		);
		this._ast = null;
	}

	applyNoParseRule(rule, content) {
		// must start with "rule" if rule is a string
		if (typeof rule === "string") {
			return content.indexOf(rule) === 0;
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
			this._source.updateHash(/** @type {TODO} */ (hash));
		}
		hash.update("meta");
		hash.update(JSON.stringify(this.buildMeta));
		this.buildInfo.hash = hash.digest("hex");
	}

	/**
	 * @param {TODO} options TODO
	 * @param {Compilation} compilation the compilation
	 * @param {TODO} resolver TODO
	 * @param {TODO} fs the file system
	 * @param {function(WebpackError=): void} callback callback function
	 * @returns {void}
	 */
	build(options, compilation, resolver, fs, callback) {
		this._forceBuild = false;
		this._source = null;
		this._ast = null;
		this.error = null;
		this.errors.length = 0;
		this.warnings.length = 0;
		this.dependencies.length = 0;
		this.blocks.length = 0;
		this.buildMeta = {};
		this.buildInfo = {
			cacheable: false,
			parsed: true,
			fileDependencies: undefined,
			contextDependencies: undefined,
			missingDependencies: undefined,
			hash: undefined,
			assets: undefined
		};

		return this.doBuild(options, compilation, resolver, fs, err => {
			this._cachedSources.clear();

			// if we have an error mark module as failed and exit
			if (err) {
				this.markModuleAsErrored(err);
				this._initBuildHash(compilation);
				return callback();
			}

			// check if this module should !not! be parsed.
			// if so, exit here;
			const noParseRule = options.module && options.module.noParse;
			if (this.shouldPreventParsing(noParseRule, this.request)) {
				// We assume that we need module and exports
				this.buildInfo.parsed = false;
				this._initBuildHash(compilation);
				return callback();
			}

			const handleParseError = e => {
				const source = this._source.source();
				const error = new ModuleParseError(source, e);
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
				this._lastSuccessfulBuildMeta = this.buildMeta;
				this._initBuildHash(compilation);
				return callback();
			};

			try {
				const result = this.parser.parse(
					this._ast || this._source.source(),
					{
						current: this,
						module: this,
						compilation: compilation,
						options: options
					},
					(err, result) => {
						if (err) {
							handleParseError(err);
						} else {
							handleParseResult(result);
						}
					}
				);
				if (result !== undefined) {
					// parse is sync
					handleParseResult(result);
				}
			} catch (e) {
				handleParseError(e);
			}
		});
	}

	/**
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {DependencyTemplates} dependencyTemplates dependency templates
	 * @returns {string} hash
	 */
	_getHashDigest(chunkGraph, dependencyTemplates) {
		const hash = chunkGraph.getModuleHash(this);
		const dtHash = dependencyTemplates.getHash();
		return `${hash}-${dtHash}`;
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source(sourceContext) {
		return this._generateSource(sourceContext).source;
	}

	/**
	 * @returns {Set<string>} types availiable (do not mutate)
	 */
	getSourceTypes() {
		return this.generator.getTypes();
	}

	/**
	 * @typedef {Object} GenerateSourceContext
	 */

	/**
	 * @typedef {Object} GenerateSourceResult
	 * @property {Source} source the generated source
	 * @property {Set<string>} runtimeRequirements the requirements for the runtime
	 */

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {GenerateSourceResult} generated source result
	 */
	_generateSource({
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		type = "javascript"
	}) {
		const hashDigest = this._getHashDigest(chunkGraph, dependencyTemplates);
		const cacheEntry = this._cachedSources.get(type);
		if (cacheEntry !== undefined && cacheEntry.hash === hashDigest) {
			// We can reuse the cached data
			return cacheEntry;
		}

		/** @type {Set<string>} */
		const runtimeRequirements = new Set();

		if (!this.buildInfo.parsed) {
			runtimeRequirements.add(RuntimeGlobals.module);
			runtimeRequirements.add(RuntimeGlobals.exports);
		}

		const source = this.generator.generate(this, {
			dependencyTemplates,
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			runtimeRequirements,
			type
		});

		const cachedSource = new CachedSource(source);

		// TODO remove cast when webpack-sources types are fixed
		// CachedSource is not a Source?
		const fixedSource = /** @type {TODO} */ (cachedSource);

		/** @type {GenerateSourceResult & CachedSourceEntry} */
		const resultEntry = {
			source: fixedSource,
			runtimeRequirements,
			hash: hashDigest
		};
		this._cachedSources.set(type, resultEntry);
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

		// check snapshot for validity
		fileSystemInfo.checkSnapshotValid(this.buildInfo.snapshot, (err, valid) => {
			callback(err, !valid);
		});
	}

	/**
	 * Get a list of runtime requirements
	 * @param {SourceContext} context context for code generation
	 * @returns {Iterable<string> | null} required runtime modules
	 */
	getRuntimeRequirements(context) {
		return this._generateSource(context).runtimeRequirements;
	}

	/**
	 * @param {string=} type the source type for which the size should be estimated
	 * @returns {number} the estimated size of the module
	 */
	size(type) {
		return this.generator.getSize(this, type);
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(this.buildInfo.hash);
		super.updateHash(hash, chunkGraph);
	}

	serialize(context) {
		const { write } = context;
		// constructor
		write(this.type);
		write(this.resource);
		// deserialize
		write(this._source);
		write(this.error);
		write(this._cachedSources);
		write(this._lastSuccessfulBuildMeta);
		write(this._forceBuild);
		super.serialize(context);
	}

	static deserialize(context) {
		const { read } = context;
		const obj = new NormalModule({
			type: read(),
			resource: read(),
			// will be filled by updateCacheModule
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
		this.error = read();
		this._cachedSources = read();
		this._lastSuccessfulBuildMeta = read();
		this._forceBuild = read();
		super.deserialize(context);
	}
}

makeSerializable(NormalModule, "webpack/lib/NormalModule");

module.exports = NormalModule;
