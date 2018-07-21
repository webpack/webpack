/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const Template = require("./Template");
const ModuleHotAcceptDependency = require("./dependencies/ModuleHotAcceptDependency");
const ModuleHotDeclineDependency = require("./dependencies/ModuleHotDeclineDependency");
const RawSource = require("webpack-sources").RawSource;
const ConstDependency = require("./dependencies/ConstDependency");
const NullFactory = require("./NullFactory");
const ParserHelpers = require("./ParserHelpers");

module.exports = class HotModuleReplacementPlugin {
	constructor(options) {
		this.options = options || {};
		this.multiStep = this.options.multiStep;
		this.fullBuildTimeout = this.options.fullBuildTimeout || 200;
		this.requestTimeout = this.options.requestTimeout || 10000;
	}

	apply(compiler) {
		const multiStep = this.multiStep;
		const fullBuildTimeout = this.fullBuildTimeout;
		const requestTimeout = this.requestTimeout;
		const hotUpdateChunkFilename = compiler.options.output.hotUpdateChunkFilename;
		const hotUpdateMainFilename = compiler.options.output.hotUpdateMainFilename;
		compiler.plugin("additional-pass", callback => {
			if(multiStep)
				return setTimeout(callback, fullBuildTimeout);
			return callback();
		});
		compiler.plugin("compilation", (compilation, params) => {
			const hotUpdateChunkTemplate = compilation.hotUpdateChunkTemplate;
			if(!hotUpdateChunkTemplate) return;

			const normalModuleFactory = params.normalModuleFactory;

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
				this.modules.forEach(module => {
					const identifier = module.identifier();
					const hash = require("crypto").createHash("md5");
					module.updateHash(hash);
					records.moduleHashs[identifier] = hash.digest("hex");
				});
				records.chunkHashs = {};
				this.chunks.forEach(chunk => {
					records.chunkHashs[chunk.id] = chunk.hash;
				});
				records.chunkModuleIds = {};
				this.chunks.forEach(chunk => {
					records.chunkModuleIds[chunk.id] = chunk.mapModules(m => m.id);
				});
			});
			let initialPass = false;
			let recompilation = false;
			compilation.plugin("after-hash", function() {
				let records = this.records;
				if(!records) {
					initialPass = true;
					return;
				}
				if(!records.hash)
					initialPass = true;
				const preHash = records.preHash || "x";
				const prepreHash = records.prepreHash || "x";
				if(preHash === this.hash) {
					recompilation = true;
					this.modifyHash(prepreHash);
					return;
				}
				records.prepreHash = records.hash || "x";
				records.preHash = this.hash;
				this.modifyHash(records.prepreHash);
			});
			compilation.plugin("should-generate-chunk-assets", () => {
				if(multiStep && !recompilation && !initialPass)
					return false;
			});
			compilation.plugin("need-additional-pass", () => {
				if(multiStep && !recompilation && !initialPass)
					return true;
			});
			compilation.plugin("additional-chunk-assets", function() {
				const records = this.records;
				if(records.hash === this.hash) return;
				if(!records.moduleHashs || !records.chunkHashs || !records.chunkModuleIds) return;
				this.modules.forEach(module => {
					const identifier = module.identifier();
					let hash = require("crypto").createHash("md5");
					module.updateHash(hash);
					hash = hash.digest("hex");
					module.hotUpdate = records.moduleHashs[identifier] !== hash;
				});
				const hotUpdateMainContent = {
					h: this.hash,
					c: {},
				};
				Object.keys(records.chunkHashs).forEach(function(chunkId) {
					chunkId = isNaN(+chunkId) ? chunkId : +chunkId;
					const currentChunk = this.chunks.find(chunk => chunk.id === chunkId);
					if(currentChunk) {
						const newModules = currentChunk.getModules().filter(module => module.hotUpdate);
						const allModules = {};
						currentChunk.forEachModule(module => {
							allModules[module.id] = true;
						});
						const removedModules = records.chunkModuleIds[chunkId].filter(id => !allModules[id]);
						if(newModules.length > 0 || removedModules.length > 0) {
							const source = hotUpdateChunkTemplate.render(chunkId, newModules, removedModules, this.hash, this.moduleTemplate, this.dependencyTemplates);
							const filename = this.getPath(hotUpdateChunkFilename, {
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
				const source = new RawSource(JSON.stringify(hotUpdateMainContent));
				const filename = this.getPath(hotUpdateMainFilename, {
					hash: records.hash
				});
				this.assets[filename] = source;
			});

			compilation.mainTemplate.plugin("hash", hash => {
				hash.update("HotMainTemplateDecorator");
			});

			compilation.mainTemplate.plugin("module-require", (_, chunk, hash, varModuleId) => {
				return `hotCreateRequire(${varModuleId})`;
			});

			compilation.mainTemplate.plugin("require-extensions", function(source) {
				const buf = [source];
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
					.replace(/\$requestTimeout\$/g, requestTimeout)
					.replace(/\/\*foreachInstalledChunks\*\//g, chunk.chunks.length > 0 ? "for(var chunkId in installedChunks)" : `var chunkId = ${JSON.stringify(chunk.id)};`)
				]);
			});

			compilation.mainTemplate.plugin("global-hash", () => true);

			compilation.mainTemplate.plugin("current-hash", (_, length) => {
				if(isFinite(length))
					return `hotCurrentHash.substr(0, ${length})`;
				else
					return "hotCurrentHash";
			});

			compilation.mainTemplate.plugin("module-obj", function(source, chunk, hash, varModuleId) {
				return this.asString([
					`${source},`,
					`hot: hotCreateModule(${varModuleId}),`,
					"parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),",
					"children: []"
				]);
			});

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {
				parser.plugin("expression __webpack_hash__", ParserHelpers.toConstantDependency("__webpack_require__.h()"));
				parser.plugin("evaluate typeof __webpack_hash__", ParserHelpers.evaluateToString("string"));
				parser.plugin("evaluate Identifier module.hot", function(expr) {
					return ParserHelpers.evaluateToIdentifier("module.hot", !!this.state.compilation.hotUpdateChunkTemplate)(expr);
				});
				parser.plugin("call module.hot.accept", function(expr) {
					if(!this.state.compilation.hotUpdateChunkTemplate) return false;
					if(expr.arguments.length >= 1) {
						const arg = this.evaluateExpression(expr.arguments[0]);
						let params = [];
						let requests = [];
						if(arg.isString()) {
							params = [arg];
						} else if(arg.isArray()) {
							params = arg.items.filter(param => param.isString());
						}
						if(params.length > 0) {
							params.forEach((param, idx) => {
								const request = param.string;
								const dep = new ModuleHotAcceptDependency(request, param.range);
								dep.optional = true;
								dep.loc = Object.create(expr.loc);
								dep.loc.index = idx;
								this.state.module.addDependency(dep);
								requests.push(request);
							});
							if(expr.arguments.length > 1) {
								this.applyPluginsBailResult("hot accept callback", expr.arguments[1], requests);
								parser.walkExpression(expr.arguments[1]); // other args are ignored
							} else {
								this.applyPluginsBailResult("hot accept without callback", expr, requests);
							}
							return true;
						}
					}
				});
				parser.plugin("call module.hot.decline", function(expr) {
					if(!this.state.compilation.hotUpdateChunkTemplate) return false;
					if(expr.arguments.length === 1) {
						const arg = this.evaluateExpression(expr.arguments[0]);
						let params = [];
						if(arg.isString()) {
							params = [arg];
						} else if(arg.isArray()) {
							params = arg.items.filter(param => param.isString());
						}
						params.forEach((param, idx) => {
							const dep = new ModuleHotDeclineDependency(param.string, param.range);
							dep.optional = true;
							dep.loc = Object.create(expr.loc);
							dep.loc.index = idx;
							this.state.module.addDependency(dep);
						});
					}
				});
				parser.plugin("expression module.hot", ParserHelpers.skipTraversal);
			});
		});
	}

};

const hotInitCode = Template.getFunctionContent(require("./HotModuleReplacement.runtime.js"));
