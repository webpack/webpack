/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
var Template = require("./Template");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
var ModuleHotAcceptDependency = require("./dependencies/ModuleHotAcceptDependency");
var ModuleHotDeclineDependency = require("./dependencies/ModuleHotDeclineDependency");
var RawSource = require("webpack-sources").RawSource;
var ConstDependency = require("./dependencies/ConstDependency");
var NullFactory = require("./NullFactory");
const ParserHelpers = require("./ParserHelpers");

function HotModuleReplacementPlugin(options) {
	options = options || {};
	this.multiStep = options.multiStep;
	this.fullBuildTimeout = options.fullBuildTimeout || 200;
}
module.exports = HotModuleReplacementPlugin;

HotModuleReplacementPlugin.prototype.apply = function(compiler) {
	var multiStep = this.multiStep;
	var fullBuildTimeout = this.fullBuildTimeout;
	var hotUpdateChunkFilename = compiler.options.output.hotUpdateChunkFilename;
	var hotUpdateMainFilename = compiler.options.output.hotUpdateMainFilename;
	compiler.plugin("compilation", function(compilation, params) {
		var hotUpdateChunkTemplate = compilation.hotUpdateChunkTemplate;
		if(!hotUpdateChunkTemplate) return;

		var normalModuleFactory = params.normalModuleFactory;

		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

		compilation.dependencyFactories.set(ModuleHotAcceptDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(ModuleHotAcceptDependency, new ModuleHotAcceptDependency.Template());

		compilation.dependencyFactories.set(ModuleHotDeclineDependency, normalModuleFactory);
		compilation.dependencyTemplates.set(ModuleHotDeclineDependency, new ModuleHotDeclineDependency.Template());

		compilation.plugin("record", function(compilation, records) {
			if(records.hash === this.hash) return;
			records.hash = compilation.hash;
			records.moduleHashs = {};
			this.modules.forEach(function(module) {
				var identifier = module.identifier();
				var hash = require("crypto").createHash("md5");
				module.updateHash(hash);
				records.moduleHashs[identifier] = hash.digest("hex");
			});
			records.chunkHashs = {};
			this.chunks.forEach(function(chunk) {
				records.chunkHashs[chunk.id] = chunk.hash;
			});
			records.chunkModuleIds = {};
			this.chunks.forEach(function(chunk) {
				records.chunkModuleIds[chunk.id] = chunk.modules.map(function(m) {
					return m.id;
				});
			});
		});
		var initialPass = false;
		var recompilation = false;
		compilation.plugin("after-hash", function() {
			var records = this.records;
			if(!records) {
				initialPass = true;
				return;
			}
			if(!records.hash)
				initialPass = true;
			var preHash = records.preHash || "x";
			var prepreHash = records.prepreHash || "x";
			if(preHash === this.hash) {
				recompilation = true;
				this.modifyHash(prepreHash);
				return;
			}
			records.prepreHash = records.hash || "x";
			records.preHash = this.hash;
			this.modifyHash(records.prepreHash);
		});
		compilation.plugin("should-generate-chunk-assets", function() {
			if(multiStep && !recompilation && !initialPass)
				return false;
		});
		compilation.plugin("need-additional-pass", function() {
			if(multiStep && !recompilation && !initialPass)
				return true;
		});
		compiler.plugin("additional-pass", function(callback) {
			if(multiStep)
				return setTimeout(callback, fullBuildTimeout);
			return callback();
		});
		compilation.plugin("additional-chunk-assets", function() {
			var records = this.records;
			if(records.hash === this.hash) return;
			if(!records.moduleHashs || !records.chunkHashs || !records.chunkModuleIds) return;
			this.modules.forEach(function(module) {
				var identifier = module.identifier();
				var hash = require("crypto").createHash("md5");
				module.updateHash(hash);
				hash = hash.digest("hex");
				module.hotUpdate = records.moduleHashs[identifier] !== hash;
			});
			var hotUpdateMainContent = {
				h: this.hash,
				c: {}
			};
			Object.keys(records.chunkHashs).forEach(function(chunkId) {
				chunkId = +chunkId;
				var currentChunk = this.chunks.filter(function(chunk) {
					return chunk.id === chunkId;
				})[0];
				if(currentChunk) {
					var newModules = currentChunk.modules.filter(function(module) {
						return module.hotUpdate;
					});
					var allModules = {};
					currentChunk.modules.forEach(function(module) {
						allModules[module.id] = true;
					});
					var removedModules = records.chunkModuleIds[chunkId].filter(function(id) {
						return !allModules[id];
					});
					if(newModules.length > 0 || removedModules.length > 0) {
						var source = hotUpdateChunkTemplate.render(chunkId, newModules, removedModules, this.hash, this.moduleTemplate, this.dependencyTemplates);
						var filename = this.getPath(hotUpdateChunkFilename, {
							hash: records.hash,
							chunk: currentChunk
						});
						this.additionalChunkAssets.push(filename);
						this.assets[filename] = source;
						hotUpdateMainContent.c[chunkId] = true;
						currentChunk.files.push(filename);
						this.applyPlugins("chunk-asset", currentChunk, filename);
					}
				} else {
					hotUpdateMainContent.c[chunkId] = false;
				}
			}, this);
			var source = new RawSource(JSON.stringify(hotUpdateMainContent));
			var filename = this.getPath(hotUpdateMainFilename, {
				hash: records.hash
			});
			this.assets[filename] = source;
		});

		compilation.mainTemplate.plugin("hash", function(hash) {
			hash.update("HotMainTemplateDecorator");
		});

		compilation.mainTemplate.plugin("module-require", function(_, chunk, hash, varModuleId) {
			return "hotCreateRequire(" + varModuleId + ")";
		});

		compilation.mainTemplate.plugin("require-extensions", function(source) {
			var buf = [source];
			buf.push("");
			buf.push("// __webpack_hash__");
			buf.push(this.requireFn + ".h = function() { return hotCurrentHash; };");
			return this.asString(buf);
		});

		compilation.mainTemplate.plugin("bootstrap", function(source, chunk, hash) {
			source = this.applyPluginsWaterfall("hot-bootstrap", source, chunk, hash);
			return this.asString([
				source,
				"",
				hotInitCode
				.replace(/\$require\$/g, this.requireFn)
				.replace(/\$hash\$/g, JSON.stringify(hash))
				.replace(/\/\*foreachInstalledChunks\*\//g, chunk.chunks.length > 0 ? "for(var chunkId in installedChunks)" : "var chunkId = " + chunk.id + ";")
			]);
		});

		compilation.mainTemplate.plugin("global-hash", function() {
			return true;
		});

		compilation.mainTemplate.plugin("current-hash", function(_, length) {
			if(isFinite(length))
				return "hotCurrentHash.substr(0, " + length + ")";
			else
				return "hotCurrentHash";
		});

		compilation.mainTemplate.plugin("module-obj", function(source, chunk, hash, varModuleId) {
			return this.asString([
				source + ",",
				"hot: hotCreateModule(" + varModuleId + "),",
				"parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),",
				"children: []"
			]);
		});

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
			parser.plugin("expression __webpack_hash__", function(expr) {
				var dep = new ConstDependency("__webpack_require__.h()", expr.range);
				dep.loc = expr.loc;
				this.state.current.addDependency(dep);
				return true;
			});
			parser.plugin("evaluate typeof __webpack_hash__", ParserHelpers.evaluateToString("string"));
			parser.plugin("evaluate Identifier module.hot", function(expr) {
				return new BasicEvaluatedExpression()
					.setBoolean(!!this.state.compilation.hotUpdateChunkTemplate)
					.setRange(expr.range);
			});
			parser.plugin("call module.hot.accept", function(expr) {
				if(!this.state.compilation.hotUpdateChunkTemplate) return false;
				if(expr.arguments.length >= 1) {
					var arg = this.evaluateExpression(expr.arguments[0]);
					var params = [],
						requests = [];
					if(arg.isString()) {
						params = [arg];
					} else if(arg.isArray()) {
						params = arg.items.filter(function(param) {
							return param.isString();
						});
					}
					if(params.length > 0) {
						params.forEach(function(param, idx) {
							var request = param.string;
							var dep = new ModuleHotAcceptDependency(request, param.range);
							dep.optional = true;
							dep.loc = Object.create(expr.loc);
							dep.loc.index = idx;
							this.state.module.addDependency(dep);
							requests.push(request);
						}.bind(this));
						if(expr.arguments.length > 1)
							this.applyPluginsBailResult("hot accept callback", expr.arguments[1], requests);
						else
							this.applyPluginsBailResult("hot accept without callback", expr, requests);
					}
				}
			});
			parser.plugin("call module.hot.decline", function(expr) {
				if(!this.state.compilation.hotUpdateChunkTemplate) return false;
				if(expr.arguments.length === 1) {
					var arg = this.evaluateExpression(expr.arguments[0]);
					var params = [];
					if(arg.isString()) {
						params = [arg];
					} else if(arg.isArray()) {
						params = arg.items.filter(function(param) {
							return param.isString();
						});
					}
					params.forEach(function(param, idx) {
						var dep = new ModuleHotDeclineDependency(param.string, param.range);
						dep.optional = true;
						dep.loc = Object.create(expr.loc);
						dep.loc.index = idx;
						this.state.module.addDependency(dep);
					}.bind(this));
				}
			});
			parser.plugin("expression module.hot", function() {
				return true;
			});
		});
	});

};

var hotInitCode = Template.getFunctionContent(require("./HotModuleReplacement.runtime.js"));
