/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const NativeModule = require("module");
const crypto = require("crypto");

const SourceMapSource = require("webpack-sources").SourceMapSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const ReplaceSource = require("webpack-sources").ReplaceSource;
const CachedSource = require("webpack-sources").CachedSource;
const LineToLineMappedSource = require("webpack-sources").LineToLineMappedSource;

const WebpackError = require("./WebpackError");
const Module = require("./Module");
const ModuleParseError = require("./ModuleParseError");
const ModuleBuildError = require("./ModuleBuildError");
const ModuleError = require("./ModuleError");
const ModuleWarning = require("./ModuleWarning");

const runLoaders = require("loader-runner").runLoaders;
const getContext = require("loader-runner").getContext;

const asString = (buf) => {
	if(Buffer.isBuffer(buf)) {
		return buf.toString("utf-8");
	}
	return buf;
};

const asBuffer = str => {
	if(!Buffer.isBuffer(str)) {
		return new Buffer(str, "utf-8"); // eslint-disable-line
	}
	return str;
};

const contextify = (context, request) => {
	return request.split("!").map(r => {
		const splitPath = r.split("?");
		splitPath[0] = path.relative(context, splitPath[0]);
		if(path.sep === "\\")
			splitPath[0] = splitPath[0].replace(/\\/g, "/");
		if(splitPath[0].indexOf("../") !== 0)
			splitPath[0] = "./" + splitPath[0];
		return splitPath.join("?");
	}).join("!");
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

	constructor(type, request, userRequest, rawRequest, loaders, resource, parser, resolveOptions) {
		super(type);

		// Info from Factory
		this.request = request;
		this.userRequest = userRequest;
		this.rawRequest = rawRequest;
		this.binary = type.startsWith("webassembly");
		this.parser = parser;
		this.resource = resource;
		this.context = getContext(resource);
		this.loaders = loaders;
		if(resolveOptions !== undefined)
			this.resolveOptions = resolveOptions;

		// Info from Build
		this.fileDependencies = new Set();
		this.contextDependencies = new Set();
		this.error = null;
		this._source = null;
		this.buildTimestamp = undefined;
		this.cacheable = false;
		this._cachedSource = null;

		// Options for the NormalModule set by plugins
		// TODO refactor this -> options object filled from Factory
		this.useSourceMap = false;
		this.lineToLine = false;
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
		if(idx >= 0) return this.resource.substr(0, idx);
		return this.resource;
	}

	createSourceForAsset(name, content, sourceMap) {
		if(!sourceMap) {
			return new RawSource(content);
		}

		if(typeof sourceMap === "string") {
			return new OriginalSource(content, sourceMap);
		}

		return new SourceMapSource(content, name, sourceMap);
	}

	createLoaderContext(resolver, options, compilation, fs) {
		const loaderContext = {
			version: 2,
			emitWarning: (warning) => {
				if(!(warning instanceof Error))
					warning = new NonErrorEmittedError(warning);
				this.warnings.push(new ModuleWarning(this, warning));
			},
			emitError: (error) => {
				if(!(error instanceof Error))
					error = new NonErrorEmittedError(error);
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
				resolver.resolve({}, context, request, callback);
			},
			emitFile: (name, content, sourceMap) => {
				if(!this.assets) this.assets = Object.create(null);
				this.assets[name] = this.createSourceForAsset(name, content, sourceMap);
			},
			rootContext: options.context,
			webpack: true,
			sourceMap: !!this.useSourceMap,
			_module: this,
			_compilation: compilation,
			_compiler: compilation.compiler,
			fs: fs,
		};

		compilation.applyPlugins("normal-module-loader", loaderContext, this);
		if(options.loader)
			Object.assign(loaderContext, options.loader);

		return loaderContext;
	}

	createSource(source, resourceBuffer, sourceMap) {
		// if there is no identifier return raw source
		if(!this.identifier) {
			return new RawSource(source);
		}

		// from here on we assume we have an identifier
		const identifier = this.identifier();

		if(this.lineToLine && resourceBuffer) {
			return new LineToLineMappedSource(
				source, identifier, asString(resourceBuffer));
		}

		if(this.useSourceMap && sourceMap) {
			return new SourceMapSource(source, identifier, sourceMap);
		}

		if(Buffer.isBuffer(source)) {
			return new RawSource(source);
		}

		return new OriginalSource(source, identifier);
	}

	doBuild(options, compilation, resolver, fs, callback) {
		this.cacheable = false;
		const loaderContext = this.createLoaderContext(resolver, options, compilation, fs);

		runLoaders({
			resource: this.resource,
			loaders: this.loaders,
			context: loaderContext,
			readResource: fs.readFile.bind(fs)
		}, (err, result) => {
			if(result) {
				this.cacheable = result.cacheable;
				this.fileDependencies = new Set(result.fileDependencies);
				this.contextDependencies = new Set(result.contextDependencies);
			}

			if(err) {
				const error = new ModuleBuildError(this, err);
				return callback(error);
			}

			const resourceBuffer = result.resourceBuffer;
			const source = result.result[0];
			const sourceMap = result.result.length >= 1 ? result.result[1] : null;
			const extraInfo = result.result.length >= 2 ? result.result[2] : null;

			if(!Buffer.isBuffer(source) && typeof source !== "string") {
				const error = new ModuleBuildError(this, new Error("Final loader didn't return a Buffer or String"));
				return callback(error);
			}

			this._source = this.createSource(this.binary ? asBuffer(source) : asString(source), resourceBuffer, sourceMap);
			this._ast = typeof extraInfo === "object" && extraInfo !== null && extraInfo.webpackAST !== undefined ? extraInfo.webpackAST : null;
			return callback();
		});
	}

	markModuleAsErrored(error) {
		this.meta = null;
		this.error = error;
		this.errors.push(this.error);
		this._source = new RawSource("throw new Error(" + JSON.stringify(this.error.message) + ");");
		this._ast = null;
	}

	applyNoParseRule(rule, content) {
		// must start with "rule" if rule is a string
		if(typeof rule === "string") {
			return content.indexOf(rule) === 0;
		}

		if(typeof rule === "function") {
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
		if(!noParseRule) {
			return false;
		}

		// we only have one rule to check
		if(!Array.isArray(noParseRule)) {
			// returns "true" if the module is !not! to be parsed
			return this.applyNoParseRule(noParseRule, request);
		}

		for(let i = 0; i < noParseRule.length; i++) {
			const rule = noParseRule[i];
			// early exit on first truthy match
			// this module is !not! to be parsed
			if(this.applyNoParseRule(rule, request)) {
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
		this.meta = {};

		return this.doBuild(options, compilation, resolver, fs, (err) => {
			this.dependencies.length = 0;
			this.variables.length = 0;
			this.blocks.length = 0;
			this._cachedSource = null;

			// if we have an error mark module as failed and exit
			if(err) {
				this.markModuleAsErrored(err);
				return callback();
			}

			// check if this module should !not! be parsed.
			// if so, exit here;
			const noParseRule = options.module && options.module.noParse;
			if(this.shouldPreventParsing(noParseRule, this.request)) {
				return callback();
			}

			try {
				this.parser.parse(this._ast || this._source.source(), {
					current: this,
					module: this,
					compilation: compilation,
					options: options
				});
			} catch(e) {
				const source = this._source.source();
				const error = new ModuleParseError(this, source, e);
				this.markModuleAsErrored(error);
				return callback();
			}
			return callback();
		});
	}

	getHashDigest(dependencyTemplates) {
		let dtHash = dependencyTemplatesHashMap.get("hash");
		const hash = crypto.createHash("md5");
		this.updateHash(hash);
		hash.update(`${dtHash}`);
		return hash.digest("hex");
	}

	sourceDependency(dependency, dependencyTemplates, source, outputOptions, requestShortener) {
		const template = dependencyTemplates.get(dependency.constructor);
		if(!template) throw new Error("No template for dependency: " + dependency.constructor.name);
		template.apply(dependency, source, outputOptions, requestShortener, dependencyTemplates);
	}

	sourceVariables(variable, availableVars, dependencyTemplates, outputOptions, requestShortener) {
		const name = variable.name;
		const expr = variable.expressionSource(dependencyTemplates, outputOptions, requestShortener);

		if(availableVars.some(v => v.name === name && v.expression.source() === expr.source())) {
			return;
		}
		return {
			name: name,
			expression: expr
		};
	}

	/*
	 * creates the start part of a IIFE around the module to inject a variable name
	 * (function(...){   <- this part
	 * }.call(...))
	 */
	variableInjectionFunctionWrapperStartCode(varNames) {
		const args = varNames.join(", ");
		return `/* WEBPACK VAR INJECTION */(function(${args}) {`;
	}

	contextArgument(block) {
		if(this === block) {
			return this.exportsArgument;
		}
		return "this";
	}

	/*
	 * creates the end part of a IIFE around the module to inject a variable name
	 * (function(...){
	 * }.call(...))   <- this part
	 */
	variableInjectionFunctionWrapperEndCode(varExpressions, block) {
		const firstParam = this.contextArgument(block);
		const furtherParams = varExpressions.map(e => e.source()).join(", ");
		return `}.call(${firstParam}, ${furtherParams}))`;
	}

	splitVariablesInUniqueNamedChunks(vars) {
		const startState = [
			[]
		];
		return vars.reduce((chunks, variable) => {
			const current = chunks[chunks.length - 1];
			// check if variable with same name exists already
			// if so create a new chunk of variables.
			const variableNameAlreadyExists = current.some(v => v.name === variable.name);

			if(variableNameAlreadyExists) {
				// start new chunk with current variable
				chunks.push([variable]);
			} else {
				// else add it to current chunk
				current.push(variable);
			}
			return chunks;
		}, startState);
	}

	sourceBlock(block, availableVars, dependencyTemplates, source, outputOptions, requestShortener) {
		block.dependencies.forEach((dependency) => this.sourceDependency(
			dependency, dependencyTemplates, source, outputOptions, requestShortener));

		/**
		 * Get the variables of all blocks that we need to inject.
		 * These will contain the variable name and its expression.
		 * The name will be added as a paramter in a IIFE the expression as its value.
		 */
		const vars = block.variables.reduce((result, value) => {
			const variable = this.sourceVariables(
				value, availableVars, dependencyTemplates, outputOptions, requestShortener);

			if(variable) {
				result.push(variable);
			}

			return result;
		}, []);

		/**
		 * if we actually have variables
		 * this is important as how #splitVariablesInUniqueNamedChunks works
		 * it will always return an array in an array which would lead to a IIFE wrapper around
		 * a module if we do this with an empty vars array.
		 */
		if(vars.length > 0) {
			/**
			 * Split all variables up into chunks of unique names.
			 * e.g. imagine you have the following variable names that need to be injected:
			 * [foo, bar, baz, foo, some, more]
			 * we can not inject "foo" twice, therefore we just make two IIFEs like so:
			 * (function(foo, bar, baz){
			 *   (function(foo, some, more){
			 *     ...
			 *   }(...));
			 * }(...));
			 *
			 * "splitVariablesInUniqueNamedChunks" splits the variables shown above up to this:
			 * [[foo, bar, baz], [foo, some, more]]
			 */
			const injectionVariableChunks = this.splitVariablesInUniqueNamedChunks(vars);

			// create all the beginnings of IIFEs
			const functionWrapperStarts = injectionVariableChunks.map((variableChunk) => {
				return this.variableInjectionFunctionWrapperStartCode(
					variableChunk.map(variable => variable.name)
				);
			});

			// and all the ends
			const functionWrapperEnds = injectionVariableChunks.map((variableChunk) => {
				return this.variableInjectionFunctionWrapperEndCode(
					variableChunk.map(variable => variable.expression), block
				);
			});

			// join them to one big string
			const varStartCode = functionWrapperStarts.join("");

			// reverse the ends first before joining them, as the last added must be the inner most
			const varEndCode = functionWrapperEnds.reverse().join("");

			// if we have anything, add it to the source
			if(varStartCode && varEndCode) {
				const start = block.range ? block.range[0] : -10;
				const end = block.range ? block.range[1] : (this._source.size() + 1);
				source.insert(start + 0.5, varStartCode);
				source.insert(end + 0.5, "\n/* WEBPACK VAR INJECTION */" + varEndCode);
			}
		}

		block.blocks.forEach((block) =>
			this.sourceBlock(
				block,
				availableVars.concat(vars),
				dependencyTemplates,
				source,
				outputOptions,
				requestShortener
			)
		);
	}

	source(dependencyTemplates, outputOptions, requestShortener) {
		if(this.type.startsWith("javascript")) {
			const hashDigest = this.getHashDigest(dependencyTemplates);
			if(this._cachedSource && this._cachedSource.hash === hashDigest) {
				return this._cachedSource.source;
			}

			if(!this._source) {
				return new RawSource("throw new Error('No source available');");
			}

			const source = new ReplaceSource(this._source);
			this._cachedSource = {
				source: source,
				hash: hashDigest
			};

			this.sourceBlock(this, [], dependencyTemplates, source, outputOptions, requestShortener);
			return new CachedSource(source);
		}
		return this._source;
	}

	originalSource() {
		return this._source;
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		// always try to rebuild in case of an error
		if(this.error) return true;

		// always rebuild when module is not cacheable
		if(!this.cacheable) return true;

		// Check timestamps of all dependencies
		// Missing timestamp -> need rebuild
		// Timestamp bigger than buildTimestamp -> need rebuild
		for(const file of this.fileDependencies) {
			const timestamp = fileTimestamps[file];
			if(!timestamp) return true;
			if(timestamp >= this.buildTimestamp) return true;
		}
		for(const file of this.contextDependencies) {
			const timestamp = contextTimestamps[file];
			if(!timestamp) return true;
			if(timestamp >= this.buildTimestamp) return true;
		}
		// elsewise -> no rebuild needed
		return false;
	}

	size() {
		return this._source ? this._source.size() : -1;
	}

	updateHashWithSource(hash) {
		if(!this._source) {
			hash.update("null");
			return;
		}
		hash.update("source");
		this._source.updateHash(hash);
	}

	updateHashWithMeta(hash) {
		hash.update("meta");
		hash.update(JSON.stringify(this.meta));
	}

	updateHash(hash) {
		this.updateHashWithSource(hash);
		this.updateHashWithMeta(hash);
		super.updateHash(hash);
	}

}

module.exports = NormalModule;
