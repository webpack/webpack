/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const NativeModule = require("module");
const Module = require("./Module");
const SourceMapSource = require("webpack-sources").SourceMapSource;
const OriginalSource = require("webpack-sources").OriginalSource;
const RawSource = require("webpack-sources").RawSource;
const ReplaceSource = require("webpack-sources").ReplaceSource;
const CachedSource = require("webpack-sources").CachedSource;
const LineToLineMappedSource = require("webpack-sources").LineToLineMappedSource;
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

function contextify(options, request) {
	return request.split("!").map(function(r) {
		let rp = path.relative(options.context, r);
		if(path.sep === "\\")
			rp = rp.replace(/\\/g, "/");
		if(rp.indexOf("../") !== 0)
			rp = "./" + rp;
		return rp;
	}).join("!");
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
		return contextify(options, this.userRequest);
	}

	nameForCondition() {
		const idx = this.resource.indexOf("?");
		if(idx >= 0) return this.resource.substr(0, idx);
		return this.resource;
	}

	doBuild(options, compilation, resolver, fs, callback) {
		this.cacheable = false;
		const module = this;
		const loaderContext = {
			version: 2,
			emitWarning: (warning) => {
				module.warnings.push(new ModuleWarning(module, warning));
			},
			emitError: function(error) {
				module.errors.push(new ModuleError(module, error));
			},
			exec: function(code, filename) {
				const m = new NativeModule(filename, module);
				m.paths = NativeModule._nodeModulePaths(module.context);
				m.filename = filename;
				m._compile(code, filename);
				return m.exports;
			},
			resolve: function(context, request, callback) {
				resolver.resolve({}, context, request, callback);
			},
			resolveSync: function(context, request) {
				return resolver.resolveSync({}, context, request);
			},
			options: options
		};
		loaderContext.webpack = true;
		loaderContext.sourceMap = !!this.useSourceMap;
		loaderContext.emitFile = function(name, content, sourceMap) {
			if(typeof sourceMap === "string") {
				this.assets[name] = new OriginalSource(content, sourceMap);
			} else if(sourceMap) {
				this.assets[name] = new SourceMapSource(content, name, sourceMap);
			} else {
				this.assets[name] = new RawSource(content);
			}
		}.bind(this);
		loaderContext._module = this;
		loaderContext._compilation = compilation;
		loaderContext._compiler = compilation.compiler;
		loaderContext.fs = fs;
		compilation.applyPlugins("normal-module-loader", loaderContext, this);
		if(options.loader)
			for(const key in options.loader)
				loaderContext[key] = options.loader[key];

		runLoaders({
			resource: this.resource,
			loaders: this.loaders,
			context: loaderContext,
			readResource: fs.readFile.bind(fs)
		}, function(err, result) {
			if(result) {
				module.cacheable = result.cacheable;
				module.fileDependencies = result.fileDependencies;
				module.contextDependencies = result.contextDependencies;
			}
			if(err) {
				return callback(module.error = new ModuleBuildError(module, err));
			}

			const resourceBuffer = result.resourceBuffer;
			let source = result.result[0];
			const sourceMap = result.result[1];

			if(!Buffer.isBuffer(source) && typeof source !== "string") {
				return callback(module.error = new ModuleBuildError(module, new Error("Final loader didn't return a Buffer or String")));
			}
			source = asString(source);
			if(module.identifier && module.lineToLine && resourceBuffer) {
				module._source = new LineToLineMappedSource(source, module.identifier(),
					asString(resourceBuffer));
			} else if(module.identifier && module.useSourceMap && sourceMap) {
				module._source = new SourceMapSource(source, module.identifier(), sourceMap);
			} else if(module.identifier) {
				module._source = new OriginalSource(source, module.identifier());
			} else {
				module._source = new RawSource(source);
			}
			return callback();
		});
	}

	disconnect() {
		this.built = false;
		super.disconnect();
	}

	markModuleAsErrored() {
		this.meta = null;
		if(this.error) {
			this.errors.push(this.error);
			this._source = new RawSource("throw new Error(" + JSON.stringify(this.error.message) + ");");
		} else {
			this._source = new RawSource("throw new Error('Module build failed');");
		}
	}

	build(options, compilation, resolver, fs, callback) {
		this.buildTimestamp = new Date().getTime();
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
			if(err) {
				this.markModuleAsErrored();
				return callback();
			}
			if(options.module && options.module.noParse) {
				const testRegExp = function testRegExp(regExp) {
					return typeof regExp === "string" ?
						this.request.indexOf(regExp) === 0 :
						regExp.test(this.request);
				};
				if(Array.isArray(options.module.noParse)) {
					if(options.module.noParse.some(testRegExp, this))
						return callback();
				} else if(testRegExp.call(this, options.module.noParse)) {
					return callback();
				}
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
				this.error = new ModuleParseError(this, source, e);
				this.markModuleAsErrored();
				return callback();
			}
			return callback();
		});
	}

	source(dependencyTemplates, outputOptions, requestShortener) {
		let hash = require("crypto").createHash("md5");
		this.updateHash(hash);
		hash = hash.digest("hex");
		if(this._cachedSource && this._cachedSource.hash === hash) {
			return this._cachedSource.source;
		}
		const _source = this._source;
		if(!_source) return new RawSource("throw new Error('No source available');");
		const source = new ReplaceSource(_source);
		this._cachedSource = {
			source: source,
			hash: hash
		};
		const topLevelBlock = this;

		function doDep(dep) {
			const template = dependencyTemplates.get(dep.constructor);
			if(!template) throw new Error("No template for dependency: " + dep.constructor.name);
			template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
		}

		function doVariable(availableVars, vars, variable) {
			const name = variable.name;
			const expr = variable.expressionSource(dependencyTemplates, outputOptions, requestShortener);

			function isEqual(v) {
				return v.name === name && v.expression.source() === expr.source();
			}
			if(availableVars.some(isEqual)) return;
			vars.push({
				name: name,
				expression: expr
			});
		}

		function doBlock(availableVars, block) {
			block.dependencies.forEach(doDep);
			const vars = [];
			if(block.variables.length > 0) {
				block.variables.forEach(doVariable.bind(null, availableVars, vars));
				const varNames = [];
				const varExpressions = [];
				let varStartCode = "";
				let varEndCode = "";

				const emitFunction = function emitFunction() {
					if(varNames.length === 0) return;
					varStartCode += "/* WEBPACK VAR INJECTION */(function(" + varNames.join(", ") + ") {";
					// exports === this in the topLevelBlock, but exports do compress better...
					varEndCode = (topLevelBlock === block ? "}.call(" + (topLevelBlock.exportsArgument || "exports") + ", " : "}.call(this, ") +
						varExpressions.map(function(e) {
							return e.source();
						}).join(", ") + "))" + varEndCode;

					varNames.length = 0;
					varExpressions.length = 0;
				};
				vars.forEach(function(v) {
					if(varNames.indexOf(v.name) >= 0) emitFunction();
					varNames.push(v.name);
					varExpressions.push(v.expression);
				});
				emitFunction();
				const start = block.range ? block.range[0] : -10;
				const end = block.range ? block.range[1] : (_source.size() + 1);
				if(varStartCode) source.insert(start + 0.5, varStartCode);
				if(varEndCode) source.insert(end + 0.5, "\n/* WEBPACK VAR INJECTION */" + varEndCode);
			}
			block.blocks.forEach(doBlock.bind(null, availableVars.concat(vars)));
		}
		doBlock([], this);
		return new CachedSource(source);
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		let timestamp = 0;
		this.fileDependencies.forEach(function(file) {
			const ts = fileTimestamps[file];
			if(!ts) timestamp = Infinity;
			if(ts > timestamp) timestamp = ts;
		});
		this.contextDependencies.forEach(function(context) {
			const ts = contextTimestamps[context];
			if(!ts) timestamp = Infinity;
			if(ts > timestamp) timestamp = ts;
		});
		return timestamp >= this.buildTimestamp;
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
