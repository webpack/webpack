"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const webpackSources = require("webpack-sources");
const loader_runner_1 = require("loader-runner");
const crypto = require("crypto");
const path = require("path");
const ModuleParseError = require("./ModuleParseError");
const ModuleBuildError = require("./ModuleBuildError");
const ModuleError = require("./ModuleError");
const ModuleWarning = require("./ModuleWarning");
const Module = require("./Module");
function asString(buf) {
	if(Buffer.isBuffer(buf)) {
		return buf.toString("utf-8");
	}
	return buf;
}
class NormalModule extends Module {
	constructor(request, userRequest, rawRequest, loaders, resource, parser) {
		super();
		this.request = request;
		this.userRequest = userRequest;
		this.rawRequest = rawRequest;
		this.loaders = loaders;
		this.resource = resource;
		this.parser = parser;
		this.context = loader_runner_1.getContext(resource);
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
		if(idx >= 0) {
			return this.resource.substr(0, idx);
		}
		return this.resource;
	}

	doBuild(options, compilation, resolver, fs, callback) {
		this.cacheable = false;
		const self = this;
		const loaderContext = {
			version: 2,
			emitWarning(warning) {
				self.warnings.push(new ModuleWarning(self, warning));
			},
			emitError(error) {
				self.errors.push(new ModuleError(self, error));
			},
			exec(code, filename) {
				const Module = require("module");
				const m = new Module(filename, self);
				m.paths = Module._nodeModulePaths(self.context);
				m.filename = filename;
				m._compile(code, filename);
				return m.exports;
			},
			resolve(context, request, callback) {
				resolver.resolve({}, context, request, callback);
			},
			resolveSync(context, request) {
				return resolver.resolveSync({}, context, request);
			},
			options
		};
		loaderContext.webpack = true;
		loaderContext.sourceMap = !!this.useSourceMap;
		loaderContext.emitFile = (name, content, sourceMap) => {
			if(typeof sourceMap === "string") {
				this.assets[name] = new webpackSources.OriginalSource(content, sourceMap);
			} else if(sourceMap) {
				this.assets[name] = new webpackSources.SourceMapSource(content, name, sourceMap, null);
			} else {
				this.assets[name] = new webpackSources.RawSource(content);
			}
		};
		loaderContext._module = this;
		loaderContext._compilation = compilation;
		loaderContext._compiler = compilation.compiler;
		loaderContext.fs = fs;
		compilation.applyPlugins("normal-module-loader", loaderContext, this);
		if(options.loader) {
			for(const key in options.loader) {
				loaderContext[key] = options.loader[key];
			}
		}
		loader_runner_1.runLoaders({
			resource: this.resource,
			loaders: this.loaders,
			context: loaderContext,
			readResource: fs.readFile.bind(fs)
		}, (err, result) => {
			if(result) {
				self.cacheable = result.cacheable;
				self.fileDependencies = result.fileDependencies;
				self.contextDependencies = result.contextDependencies;
			}
			if(err) {
				return callback(self.error = new ModuleBuildError(self, err));
			}
			const resourceBuffer = result.resourceBuffer;
			let source = result.result[0];
			const sourceMap = result.result[1];
			if(!Buffer.isBuffer(source) && typeof source !== "string") {
				return callback(self.error = new ModuleBuildError(self, new Error("Final loader didn't return a Buffer or String")));
			}
			const sourceString = asString(source);
			if(self.identifier && self.lineToLine && resourceBuffer) {
				self._source = new webpackSources.LineToLineMappedSource(sourceString, self.identifier(), asString(resourceBuffer));
			} else if(self.identifier && self.useSourceMap && sourceMap) {
				self._source = new webpackSources.SourceMapSource(sourceString, self.identifier(), sourceMap, null);
			} else if(self.identifier) {
				self._source = new webpackSources.OriginalSource(sourceString, self.identifier());
			} else {
				self._source = new webpackSources.RawSource(sourceString);
			}
			return callback();
		});
	}

	disconnect() {
		this.built = false;
		super.disconnect();
	}

	build(options, compilation, resolver, fs, callback) {
		const self = this;
		self.buildTimestamp = new Date().getTime();
		self.built = true;
		self._source = null;
		self.error = null;
		self.errors.length = 0;
		self.warnings.length = 0;
		self.meta = {};
		return this.doBuild(options, compilation, resolver, fs, function(err) {
			self.dependencies.length = 0;
			self.variables.length = 0;
			self.blocks.length = 0;
			self._cachedSource = null;
			if(err) {
				return setError(err);
			}
			function testRegExp(regExp) {
				return typeof regExp === "string"
					? self.request.indexOf(regExp) === 0
					: regExp.test(self.request);
			}

			if(options.module && options.module.noParse) {
				if(Array.isArray(options.module.noParse)) {
					if(options.module.noParse.some(testRegExp, self)) {
						return callback();
					}
				} else if(testRegExp.call(self, options.module.noParse)) {
					return callback();
				}
			}
			try {
				self.parser.parse(self._source.source(), {
					current: self,
					module: self,
					compilation,
					options
				});
			} catch(e) {
				const source = self._source.source();
				return setError(self.error = new ModuleParseError(self, source, e));
			}
			return callback();
		});
		function setError(err) {
			self.meta = null;
			if(self.error) {
				self.errors.push(self.error);
				self._source = new webpackSources.RawSource(`throw new Error(${JSON.stringify(self.error.message)});`);
			} else {
				self._source = new webpackSources.RawSource("throw new Error('Module build failed');");
			}
			callback();
		}
	}

	source(dependencyTemplates, outputOptions, requestShortener) {
		const hash = crypto.createHash("md5");
		this.updateHash(hash);
		const hashStr = hash.digest("hex");
		if(this._cachedSource && this._cachedSource.hash === hashStr) {
			return this._cachedSource.source;
		}
		const _source = this._source;
		if(!_source) {
			return new webpackSources.RawSource("throw new Error('No source available');");
		}
		const source = new webpackSources.ReplaceSource(_source, "");
		this._cachedSource = {
			source,
			hash: hashStr
		};
		const topLevelBlock = this;

		function doDep(dep) {
			const template = dependencyTemplates.get(dep.constructor);
			if(!template) {
				throw new Error(`No template for dependency: ${dep.constructor.name}`);
			}
			template.apply(dep, source, outputOptions, requestShortener, dependencyTemplates);
		}

		function doVariable(availableVars, vars, variable) {
			const name = variable.name;
			const expr = variable.expressionSource(dependencyTemplates, outputOptions, requestShortener);

			function isEqual(v) {
				return v.name === name && v.expression.source() === expr.source();
			}

			if(availableVars.some(isEqual)) {
				return;
			}
			vars.push({
				name,
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
				const emitFunction = function() {
					if(varNames.length === 0) {
						return;
					}
					varStartCode += `/* WEBPACK VAR INJECTION */(function(${varNames.join(", ")}) {`;
					// exports === this in the topLevelBlock, but exports do compress better...
					varEndCode = `${(topLevelBlock === block ? "}.call(exports, " : "}.call(this, ") +
					varExpressions.map(e => e.source()).join(", ")}))${varEndCode}`;
					varNames.length = 0;
					varExpressions.length = 0;
				};
				vars.forEach(v => {
					if(varNames.indexOf(v.name) >= 0) {
						emitFunction();
					}
					varNames.push(v.name);
					varExpressions.push(v.expression);
				});
				emitFunction();
				const start = block.range ? block.range[0] : -10;
				const end = block.range ? block.range[1] : _source.size() + 1;
				if(varStartCode) {
					source.insert(start + 0.5, varStartCode);
				}
				if(varEndCode) {
					source.insert(end + 0.5, `\n/* WEBPACK VAR INJECTION */${varEndCode}`);
				}
			}
			block.blocks.forEach(doBlock.bind(null, availableVars.concat(vars)));
		}

		doBlock([], this);
		return new webpackSources.CachedSource(source);
	}

	needRebuild(fileTimestamps, contextTimestamps) {
		let timestamp = 0;
		this.fileDependencies.forEach(file => {
			const ts = fileTimestamps[file];
			if(!ts) {
				timestamp = Infinity;
			}
			if(ts > timestamp) {
				timestamp = ts;
			}
		});
		this.contextDependencies.forEach(context => {
			const ts = contextTimestamps[context];
			if(!ts) {
				timestamp = Infinity;
			}
			if(ts > timestamp) {
				timestamp = ts;
			}
		});
		return timestamp >= this.buildTimestamp;
	}

	size() {
		return this._source ? this._source.size() : -1;
	}

	updateHash(hash) {
		if(this._source) {
			hash.update("source");
			this._source.updateHash(hash);
		} else {
			hash.update("null");
		}
		hash.update("meta");
		hash.update(JSON.stringify(this.meta));
		super.updateHash(hash);
	}
}
function contextify(options, request) {
	return request.split("!").map(r => {
		let rp = path.relative(options.context, r);
		if(path.sep === "\\") {
			rp = rp.replace(/\\/g, "/");
		}
		if(rp.indexOf("../") !== 0) {
			rp = `./${rp}`;
		}
		return rp;
	}).join("!");
}
module.exports = NormalModule;
