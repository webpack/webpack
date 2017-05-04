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

function asString(buf) {
	if(Buffer.isBuffer(buf)) {
		return buf.toString("utf-8");
	}
	return buf;
}

function contextify(context, request) {
	return request.split("!").map(function(r) {
		let rp = path.relative(context, r);
		if(path.sep === "\\")
			rp = rp.replace(/\\/g, "/");
		if(rp.indexOf("../") !== 0)
			rp = "./" + rp;
		return rp;
	}).join("!");
}

class NonErrorEmittedError extends WebpackError {
	constructor(error) {
		super();

		this.name = "NonErrorEmittedError";
		this.message = "(Emitted value instead of an instance of Error) " + error;

		Error.captureStackTrace(this, this.constructor);
	}
}

class NormalModule extends Module {

	constructor(request, userRequest, rawRequest, loaders, resource, parser) {
		super();
		this.request = request;
		this.userRequest = userRequest;
		this.rawRequest = rawRequest;
		this.parser = parser;
		this.resource = resource;
		this.context = getContext(resource);
		this.loaders = loaders;
		this.fileDependencies = [];
		this.contextDependencies = [];
		this.warnings = [];
		this.errors = [];
		this.error = null;
		this._source = null;
		this.assets = {};
		this.built = false;
		this._cachedSource = null;
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
			resolveSync(context, request) {
				return resolver.resolveSync({}, context, request);
			},
			emitFile: (name, content, sourceMap) => {
				this.assets[name] = this.createSourceForAsset(name, content, sourceMap);
			},
			options: options,
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
				this.fileDependencies = result.fileDependencies;
				this.contextDependencies = result.contextDependencies;
			}

			if(err) {
				const error = new ModuleBuildError(this, err);
				return callback(error);
			}

			const resourceBuffer = result.resourceBuffer;
			const source = result.result[0];
			const sourceMap = result.result[1];

			if(!Buffer.isBuffer(source) && typeof source !== "string") {
				const error = new ModuleBuildError(this, new Error("Final loader didn't return a Buffer or String"));
				return callback(error);
			}

			this._source = this.createSource(asString(source), resourceBuffer, sourceMap);
			return callback();
		});
	}

	disconnect() {
		this.built = false;
		super.disconnect();
	}

	markModuleAsErrored(error) {
		this.meta = null;
		this.error = error;
		this.errors.push(this.error);
		this._source = new RawSource("throw new Error(" + JSON.stringify(this.error.message) + ");");
	}

	applyNoParseRule(rule, content) {
		// must start with "rule" if rule is a string
		if(typeof rule === "string") {
			return content.indexOf(rule) === 0;
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
				this.parser.parse(this._source.source(), {
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

	getHashDigest() {
		const hash = crypto.createHash("md5");
		this.updateHash(hash);
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
			return this.exportsArgument || "exports";
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
		const vars = block.variables.map((variable) => this.sourceVariables(
				variable, availableVars, dependencyTemplates, outputOptions, requestShortener))
			.filter(Boolean);

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
			const functionWrapperStarts = injectionVariableChunks.map((variableChunk) => variableChunk.map(variable => variable.name))
				.map(names => this.variableInjectionFunctionWrapperStartCode(names));

			// and all the ends
			const functionWrapperEnds = injectionVariableChunks.map((variableChunk) => variableChunk.map(variable => variable.expression))
				.map(expressions => this.variableInjectionFunctionWrapperEndCode(expressions, block));

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
		block.blocks.forEach((block) => this.sourceBlock(
			block, availableVars.concat(vars), dependencyTemplates, source, outputOptions, requestShortener));
	}

	source(dependencyTemplates, outputOptions, requestShortener) {
		const hashDigest = this.getHashDigest();
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

	originalSource() {
		return this._source;
	}

	getHighestTimestamp(keys, timestampsByKey) {
		let highestTimestamp = 0;
		for(let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const timestamp = timestampsByKey[key];
			// if there is no timestamp yet, early return with Infinity
			if(!timestamp) return Infinity;
			highestTimestamp = Math.max(highestTimestamp, timestamp);
		}
		return highestTimestamp;
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		const highestFileDepTimestamp = this.getHighestTimestamp(
			this.fileDependencies, fileTimestamps);
		// if the hightest is Infinity, we need a rebuild
		// exit early here.
		if(highestFileDepTimestamp === Infinity) {
			return true;
		}

		const highestContextDepTimestamp = this.getHighestTimestamp(
			this.contextDependencies, contextTimestamps);

		// Again if the hightest is Infinity, we need a rebuild
		// exit early here.
		if(highestContextDepTimestamp === Infinity) {
			return true;
		}

		// else take the highest of file and context timestamps and compare
		// to last build timestamp
		return Math.max(highestContextDepTimestamp, highestFileDepTimestamp) >= this.buildTimestamp;
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
