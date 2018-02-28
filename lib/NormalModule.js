/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const NativeModule = require("module");

const SourceMapSource = require("webpack-sources").SourceMapSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const CachedSource = require("webpack-sources").CachedSource;
const LineToLineMappedSource = require("webpack-sources")
	.LineToLineMappedSource;

const WebpackError = require("./WebpackError");
const Module = require("./Module");
const ModuleParseError = require("./ModuleParseError");
const ModuleBuildError = require("./ModuleBuildError");
const ModuleError = require("./ModuleError");
const ModuleWarning = require("./ModuleWarning");

const runLoaders = require("loader-runner").runLoaders;
const getContext = require("loader-runner").getContext;

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

const contextify = (context, request) => {
	return request
		.split("!")
		.map(r => {
			const splitPath = r.split("?");
			splitPath[0] = path.relative(context, splitPath[0]);
			if (path.sep === "\\") splitPath[0] = splitPath[0].replace(/\\/g, "/");
			if (splitPath[0].indexOf("../") !== 0) splitPath[0] = "./" + splitPath[0];
			return splitPath.join("?");
		})
		.join("!");
};

class NonErrorEmittedError extends WebpackError {
	constructor(error) {
		super();

		this.name = "NonErrorEmittedError";
		this.message = "(Emitted value instead of an instance of Error) " + error;

		Error.captureStackTrace(this, this.constructor);
	}
}

const dependencyTemplatesHashMap = new WeakMap();

class NormalModule extends Module {
	constructor({
		type,
		request,
		userRequest,
		rawRequest,
		loaders,
		resource,
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
		this.loaders = loaders;
		if (resolveOptions !== undefined) this.resolveOptions = resolveOptions;

		// Info from Build
		this.error = null;
		this._source = null;
		this.buildTimestamp = undefined;
		this._cachedSource = undefined;
		this._cachedSourceHash = undefined;

		// Options for the NormalModule set by plugins
		// TODO refactor this -> options object filled from Factory
		this.useSourceMap = false;
		this.lineToLine = false;

		// Cache
		this._lastSuccessfulBuildMeta = {};
	}

	identifier() {
		return this.request;
	}

	readableIdentifier(requestShortener) {
		return requestShortener.shorten(this.userRequest);
	}

	libIdent(options) {
		return contextify(options.context, this.userRequest);
	}

	nameForCondition() {
		const idx = this.resource.indexOf("?");
		if (idx >= 0) return this.resource.substr(0, idx);
		return this.resource;
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
		const loaderContext = {
			version: 2,
			emitWarning: warning => {
				if (!(warning instanceof Error))
					warning = new NonErrorEmittedError(warning);
				this.warnings.push(new ModuleWarning(this, warning));
			},
			emitError: error => {
				if (!(error instanceof Error)) error = new NonErrorEmittedError(error);
				this.errors.push(new ModuleError(this, error));
			},
			exec: (code, filename) => {
				const module = new NativeModule(filename, this);
				module.paths = NativeModule._nodeModulePaths(this.context);
				module.filename = filename;
				module._compile(code, filename);
				return module.exports;
			},
			resolve(context, request, callback) {
				resolver.resolve({}, context, request, {}, callback);
			},
			emitFile: (name, content, sourceMap) => {
				if (!this.buildInfo.assets) this.buildInfo.assets = Object.create(null);
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
		if (options.loader) Object.assign(loaderContext, options.loader);

		return loaderContext;
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
					const error = new ModuleBuildError(this, err);
					return callback(error);
				}

				const resourceBuffer = result.resourceBuffer;
				const source = result.result[0];
				const sourceMap = result.result.length >= 1 ? result.result[1] : null;
				const extraInfo = result.result.length >= 2 ? result.result[2] : null;

				if (!Buffer.isBuffer(source) && typeof source !== "string") {
					const error = new ModuleBuildError(
						this,
						new Error("Final loader didn't return a Buffer or String")
					);
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

	build(options, compilation, resolver, fs, callback) {
		this.buildTimestamp = Date.now();
		this.built = true;
		this._source = null;
		this._ast = null;
		this.error = null;
		this.errors.length = 0;
		this.warnings.length = 0;
		this.buildMeta = {};
		this.buildInfo = {
			cacheable: false,
			fileDependencies: new Set(),
			contextDependencies: new Set()
		};

		return this.doBuild(options, compilation, resolver, fs, err => {
			this._cachedSource = undefined;
			this._cachedSourceHash = undefined;

			// if we have an error mark module as failed and exit
			if (err) {
				this.markModuleAsErrored(err);
				return callback();
			}

			// check if this module should !not! be parsed.
			// if so, exit here;
			const noParseRule = options.module && options.module.noParse;
			if (this.shouldPreventParsing(noParseRule, this.request)) {
				return callback();
			}

			const handleParseError = e => {
				const source = this._source.source();
				const error = new ModuleParseError(this, source, e);
				this.markModuleAsErrored(error);
				return callback();
			};

			const handleParseResult = result => {
				this._lastSuccessfulBuildMeta = this.buildMeta;
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

	getHashDigest(dependencyTemplates) {
		let dtHash = dependencyTemplatesHashMap.get("hash");
		return `${this.hash}-${dtHash}`;
	}

	source(dependencyTemplates, runtimeTemplate) {
		const hashDigest = this.getHashDigest(dependencyTemplates);
		if (this._cachedSourceHash === hashDigest) {
			// We can reuse the cached source
			return this._cachedSource;
		}

		const source = this.generator.generate(
			this,
			dependencyTemplates,
			runtimeTemplate
		);

		const cachedSource = new CachedSource(source);
		this._cachedSource = cachedSource;
		this._cachedSourceHash = hashDigest;
		return cachedSource;
	}

	originalSource() {
		return this._source;
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		// always try to rebuild in case of an error
		if (this.error) return true;

		// always rebuild when module is not cacheable
		if (!this.buildInfo.cacheable) return true;

		// Check timestamps of all dependencies
		// Missing timestamp -> need rebuild
		// Timestamp bigger than buildTimestamp -> need rebuild
		for (const file of this.buildInfo.fileDependencies) {
			const timestamp = fileTimestamps.get(file);
			if (!timestamp) return true;
			if (timestamp >= this.buildTimestamp) return true;
		}
		for (const file of this.buildInfo.contextDependencies) {
			const timestamp = contextTimestamps.get(file);
			if (!timestamp) return true;
			if (timestamp >= this.buildTimestamp) return true;
		}
		// elsewise -> no rebuild needed
		return false;
	}

	size() {
		return this._source ? this._source.size() : -1;
	}

	updateHashWithSource(hash) {
		if (!this._source) {
			hash.update("null");
			return;
		}
		hash.update("source");
		this._source.updateHash(hash);
	}

	updateHashWithMeta(hash) {
		hash.update("meta");
		hash.update(JSON.stringify(this.buildMeta));
	}

	updateHash(hash) {
		this.updateHashWithSource(hash);
		this.updateHashWithMeta(hash);
		super.updateHash(hash);
	}
}

module.exports = NormalModule;
