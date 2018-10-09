/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { getContext, runLoaders } = require("loader-runner");
const asyncLib = require("neo-async");
const {
	CachedSource,
	LineToLineMappedSource,
	OriginalSource,
	RawSource,
	SourceMapSource
} = require("webpack-sources");
const Module = require("./Module");
const ModuleBuildError = require("./ModuleBuildError");
const ModuleError = require("./ModuleError");
const ModuleParseError = require("./ModuleParseError");
const ModuleWarning = require("./ModuleWarning");
const WebpackError = require("./WebpackError");
const compareLocations = require("./compareLocations");
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
/** @typedef {import("./WebpackError")} WebpackError */
/** @typedef {import("./util/createHash").Hash} Hash */

const EARLY_RETURN_ERROR = new Error("flags early return is not an error");

const asString = buf => {
	if (Buffer.isBuffer(buf)) {
		return buf.toString("utf-8");
	}
	return buf;
};

const asBuffer = str => {
	if (!Buffer.isBuffer(str)) {
		return Buffer.from(str, "utf-8");
	}
	return str;
};

class NonErrorEmittedError extends WebpackError {
	constructor(error) {
		super();

		this.name = "NonErrorEmittedError";
		this.message = "(Emitted value instead of an instance of Error) " + error;

		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * @typedef {Object} CachedSourceEntry
 * @property {TODO} source the generated source
 * @property {string} hash the hash value
 */

class NormalModule extends Module {
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
		this.request = request;
		this.userRequest = userRequest;
		this.rawRequest = rawRequest;
		this.binary = type.startsWith("webassembly");
		this.parser = parser;
		this.generator = generator;
		this.resource = resource;
		this.matchResource = matchResource;
		this.loaders = loaders;
		if (resolveOptions !== undefined) this.resolveOptions = resolveOptions;

		// Info from Build
		this.error = null;
		this._source = null;
		this._buildHash = "";
		this.buildTimestamp = undefined;
		/** @private @type {Map<string, CachedSourceEntry>} */
		this._cachedSources = new Map();

		// Options for the NormalModule set by plugins
		// TODO refactor this -> options object filled from Factory
		this.useSourceMap = false;
		this.lineToLine = false;

		// Cache
		this._lastSuccessfulBuildMeta = {};
		this._forceBuild = true;
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
					new ModuleWarning(this, warning, {
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
					new ModuleError(this, error, {
						from: requestShortener.shorten(currentLoader.loader)
					})
				);
			},
			resolve(context, request, callback) {
				resolver.resolve({}, context, request, {}, callback);
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

		compilation.hooks.normalModuleLoader.call(loaderContext, this);
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

	createSource(source, resourceBuffer, sourceMap) {
		// if there is no identifier return raw source
		if (!this.identifier) {
			return new RawSource(source);
		}

		// from here on we assume we have an identifier
		const identifier = this.identifier();

		if (this.lineToLine && resourceBuffer) {
			return new LineToLineMappedSource(
				source,
				identifier,
				asString(resourceBuffer)
			);
		}

		if (this.useSourceMap && sourceMap) {
			return new SourceMapSource(source, identifier, sourceMap);
		}

		if (Buffer.isBuffer(source)) {
			// @ts-ignore
			// TODO We need to fix @types/webpack-sources to allow RawSource to take a Buffer | string
			return new RawSource(source);
		}

		return new OriginalSource(source, identifier);
	}

	doBuild(options, compilation, resolver, fs, callback) {
		const loaderContext = this.createLoaderContext(
			resolver,
			options,
			compilation,
			fs
		);

		runLoaders(
			{
				resource: this.resource,
				loaders: this.loaders,
				context: loaderContext,
				readResource: fs.readFile.bind(fs)
			},
			(err, result) => {
				if (result) {
					this.buildInfo.cacheable = result.cacheable;
					this.buildInfo.fileDependencies = new Set(result.fileDependencies);
					this.buildInfo.contextDependencies = new Set(
						result.contextDependencies
					);
				}

				if (err) {
					if (!(err instanceof Error)) {
						err = new NonErrorEmittedError(err);
					}
					const currentLoader = this.getCurrentLoader(loaderContext);
					const error = new ModuleBuildError(this, err, {
						from:
							currentLoader &&
							compilation.runtimeTemplate.requestShortener.shorten(
								currentLoader.loader
							)
					});
					return callback(error);
				}

				const resourceBuffer = result.resourceBuffer;
				const source = result.result[0];
				const sourceMap = result.result.length >= 1 ? result.result[1] : null;
				const extraInfo = result.result.length >= 2 ? result.result[2] : null;

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
					const error = new ModuleBuildError(this, err);
					return callback(error);
				}

				this._source = this.createSource(
					this.binary ? asBuffer(source) : asString(source),
					resourceBuffer,
					sourceMap
				);
				this._ast =
					typeof extraInfo === "object" &&
					extraInfo !== null &&
					extraInfo.webpackAST !== undefined
						? extraInfo.webpackAST
						: null;
				return callback();
			}
		);
	}

	markModuleAsErrored(error) {
		// Restore build meta from successful build to keep importing state
		this.buildMeta = Object.assign({}, this._lastSuccessfulBuildMeta);

		this.error = error;
		this.errors.push(this.error);
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
			this._source.updateHash(hash);
		}
		hash.update("meta");
		hash.update(JSON.stringify(this.buildMeta));
		this._buildHash = hash.digest("hex");
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
		this.buildTimestamp = Date.now();
		this._forceBuild = false;
		this._source = null;
		this._ast = null;
		this._buildHash = "";
		this.error = null;
		this.errors.length = 0;
		this.warnings.length = 0;
		this.dependencies.length = 0;
		this.blocks.length = 0;
		this.buildMeta = {};
		this.buildInfo = {
			cacheable: false,
			fileDependencies: new Set(),
			contextDependencies: new Set()
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
				this._initBuildHash(compilation);
				return callback();
			}

			const handleParseError = e => {
				const source = this._source.source();
				const error = new ModuleParseError(this, source, e);
				this.markModuleAsErrored(error);
				this._initBuildHash(compilation);
				return callback();
			};

			const handleParseResult = result => {
				this.dependencies.sort((a, b) => compareLocations(a.loc, b.loc));
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
	getHashDigest(chunkGraph, dependencyTemplates) {
		const hash = chunkGraph.getModuleHash(this);
		const dtHash = dependencyTemplates.getHash();
		return `${hash}-${dtHash}`;
	}

	/**
	 * @param {SourceContext} sourceContext source context
	 * @returns {Source} generated source
	 */
	source({
		dependencyTemplates,
		runtimeTemplate,
		moduleGraph,
		chunkGraph,
		type = "javascript"
	}) {
		const hashDigest = this.getHashDigest(chunkGraph, dependencyTemplates);
		const cacheEntry = this._cachedSources.get(type);
		if (cacheEntry !== undefined && cacheEntry.hash === hashDigest) {
			// We can reuse the cached source
			return cacheEntry.source;
		}

		const source = this.generator.generate(this, {
			dependencyTemplates,
			runtimeTemplate,
			moduleGraph,
			chunkGraph,
			type
		});

		const cachedSource = new CachedSource(source);
		this._cachedSources.set(type, {
			source: cachedSource,
			hash: hashDigest
		});
		// TODO remove cast when webpack-sources types are fixed
		// CachedSource is not a Source?
		const fixedSource = /** @type {TODO} */ (cachedSource);
		return fixedSource;
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

		// Check timestamps of all dependencies
		// Missing timestamp -> need build
		// Timestamp bigger than buildTimestamp -> need build
		asyncLib.parallel(
			[
				callback =>
					asyncLib.each(
						this.buildInfo.fileDependencies,
						(file, callback) => {
							fileSystemInfo.getFileTimestamp(file, (err, info) => {
								if (err) return callback(err);
								if (!info || info.safeTime >= this.buildTimestamp)
									return callback(EARLY_RETURN_ERROR);
								callback();
							});
						},
						callback
					),
				callback =>
					asyncLib.each(
						this.buildInfo.contextDependencies,
						(context, callback) => {
							fileSystemInfo.getContextTimestamp(context, (err, info) => {
								if (err) return callback(err);
								if (!info || info.safeTime >= this.buildTimestamp)
									return callback(EARLY_RETURN_ERROR);
								callback();
							});
						},
						callback
					)
			],
			err =>
				err === EARLY_RETURN_ERROR ? callback(null, true) : callback(err, false)
		);
	}

	/**
	 * @returns {number} the estimated size of the module
	 */
	size() {
		return this._source ? this._source.size() : -1;
	}

	/**
	 * @param {Hash} hash the hash used to track dependencies
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @returns {void}
	 */
	updateHash(hash, chunkGraph) {
		hash.update(this._buildHash);
		super.updateHash(hash, chunkGraph);
	}

	serialize(context) {
		const { write } = context;
		// constructor
		write(this.type);
		write(this.resource);
		// deserialize
		write(this._source);
		write(this._buildHash);
		write(this.buildTimestamp);
		write(this.lineToLine);
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
		this._buildHash = read();
		this.buildTimestamp = read();
		this.lineToLine = read();
		this.error = read();
		this._cachedSources = read();
		this._lastSuccessfulBuildMeta = read();
		this._forceBuild = read();
		super.deserialize(context);
	}
}

makeSerializable(NormalModule, "webpack/lib/NormalModule");

module.exports = NormalModule;
