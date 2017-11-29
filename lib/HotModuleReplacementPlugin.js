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
const createHash = require("./util/createHash");
const SyncBailHook = require("tapable").SyncBailHook;

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

			compilation.plugin("record", (compilation, records) => {
				if(records.hash === compilation.hash) return;
				records.hash = compilation.hash;
				records.moduleHashs = {};
				compilation.modules.forEach(module => {
					const identifier = module.identifier();
					const hash = createHash(compilation.outputOptions.hashFunction);
					module.updateHash(hash);
					records.moduleHashs[identifier] = hash.digest("hex");
				});
				records.chunkHashs = {};
				compilation.chunks.forEach(chunk => {
					records.chunkHashs[chunk.id] = chunk.hash;
				});
				records.chunkModuleIds = {};
				compilation.chunks.forEach(chunk => {
					records.chunkModuleIds[chunk.id] = chunk.mapModules(m => m.id);
				});
			});
			let initialPass = false;
			let recompilation = false;
			compilation.plugin("after-hash", () => {
				let records = compilation.records;
				if(!records) {
					initialPass = true;
					return;
				}
				if(!records.hash)
					initialPass = true;
				const preHash = records.preHash || "x";
				const prepreHash = records.prepreHash || "x";
				if(preHash === compilation.hash) {
					recompilation = true;
					compilation.modifyHash(prepreHash);
					return;
				}
				records.prepreHash = records.hash || "x";
				records.preHash = compilation.hash;
				compilation.modifyHash(records.prepreHash);
			});
			compilation.plugin("should-generate-chunk-assets", () => {
				if(multiStep && !recompilation && !initialPass)
					return false;
			});
			compilation.plugin("need-additional-pass", () => {
				if(multiStep && !recompilation && !initialPass)
					return true;
			});
			compilation.plugin("additional-chunk-assets", () => {
				const records = compilation.records;
				if(records.hash === compilation.hash) return;
				if(!records.moduleHashs || !records.chunkHashs || !records.chunkModuleIds) return;
				compilation.modules.forEach(module => {
					const identifier = module.identifier();
					let hash = createHash(compilation.outputOptions.hashFunction);
					module.updateHash(hash);
					hash = hash.digest("hex");
					module.hotUpdate = records.moduleHashs[identifier] !== hash;
				});
				const hotUpdateMainContent = {
					h: compilation.hash,
					c: {},
				};
				Object.keys(records.chunkHashs).forEach(chunkId => {
					chunkId = isNaN(+chunkId) ? chunkId : +chunkId;
					const currentChunk = compilation.chunks.find(chunk => chunk.id === chunkId);
					if(currentChunk) {
						const newModules = currentChunk.getModules().filter(module => module.hotUpdate);
						const allModules = {};
						currentChunk.forEachModule(module => {
							allModules[module.id] = true;
						});
						const removedModules = records.chunkModuleIds[chunkId].filter(id => !allModules[id]);
						if(newModules.length > 0 || removedModules.length > 0) {
							const source = hotUpdateChunkTemplate.render(chunkId, newModules, removedModules, compilation.hash, compilation.moduleTemplates.javascript, compilation.dependencyTemplates);
							const filename = compilation.getPath(hotUpdateChunkFilename, {
								hash: records.hash,
								chunk: currentChunk
							});
							compilation.additionalChunkAssets.push(filename);
							compilation.assets[filename] = source;
							hotUpdateMainContent.c[chunkId] = true;
							currentChunk.files.push(filename);
							compilation.applyPlugins("chunk-asset", currentChunk, filename);
						}
					} else {
						hotUpdateMainContent.c[chunkId] = false;
					}
				}, compilation);
				const source = new RawSource(JSON.stringify(hotUpdateMainContent));
				const filename = compilation.getPath(hotUpdateMainFilename, {
					hash: records.hash
				});
				compilation.assets[filename] = source;
			});

			const mainTemplate = compilation.mainTemplate;

			mainTemplate.plugin("hash", hash => {
				hash.update("HotMainTemplateDecorator");
			});

			mainTemplate.plugin("module-require", (_, chunk, hash, varModuleId) => {
				return `hotCreateRequire(${varModuleId})`;
			});

			mainTemplate.plugin("require-extensions", source => {
				const buf = [source];
				buf.push("");
				buf.push("// __webpack_hash__");
				buf.push(mainTemplate.requireFn + ".h = function() { return hotCurrentHash; };");
				return mainTemplate.asString(buf);
			});

			mainTemplate.plugin("bootstrap", (source, chunk, hash) => {
				source = mainTemplate.hooks.hotBootstrap.call(source, chunk, hash);
				return mainTemplate.asString([
					source,
					"",
					hotInitCode
					.replace(/\$require\$/g, mainTemplate.requireFn)
					.replace(/\$hash\$/g, JSON.stringify(hash))
					.replace(/\$requestTimeout\$/g, requestTimeout)
					.replace(/\/\*foreachInstalledChunks\*\//g, chunk.getNumberOfChunks() > 0 ? "for(var chunkId in installedChunks)" : `var chunkId = ${JSON.stringify(chunk.id)};`)
				]);
			});

			mainTemplate.plugin("global-hash", () => true);

			mainTemplate.plugin("current-hash", (_, length) => {
				if(isFinite(length))
					return `hotCurrentHash.substr(0, ${length})`;
				else
					return "hotCurrentHash";
			});

			mainTemplate.plugin("module-obj", (source, chunk, hash, varModuleId) => {
				return mainTemplate.asString([
					`${source},`,
					`hot: hotCreateModule(${varModuleId}),`,
					"parents: (hotCurrentParentsTemp = hotCurrentParents, hotCurrentParents = [], hotCurrentParentsTemp),",
					"children: []"
				]);
			});

			// TODO add HMR support for javascript/esm
			normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic"], (parser, parserOptions) => {
				parser.plugin("expression __webpack_hash__", ParserHelpers.toConstantDependency("__webpack_require__.h()"));
				parser.plugin("evaluate typeof __webpack_hash__", ParserHelpers.evaluateToString("string"));
				parser.plugin("evaluate Identifier module.hot", expr => {
					return ParserHelpers.evaluateToIdentifier("module.hot", !!parser.state.compilation.hotUpdateChunkTemplate)(expr);
				});
				// TODO webpack 5: refactor this, no custom hooks
				if(!parser.hooks.hotAcceptCallback)
					parser.hooks.hotAcceptCallback = new SyncBailHook(["expression", "requests"]);
				if(!parser.hooks.hotAcceptWithoutCallback)
					parser.hooks.hotAcceptWithoutCallback = new SyncBailHook(["expression", "requests"]);
				parser.plugin("call module.hot.accept", expr => {
					if(!parser.state.compilation.hotUpdateChunkTemplate) return false;
					if(expr.arguments.length >= 1) {
						const arg = parser.evaluateExpression(expr.arguments[0]);
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
								parser.state.module.addDependency(dep);
								requests.push(request);
							});
							if(expr.arguments.length > 1)
								parser.hooks.hotAcceptCallback.call(expr.arguments[1], requests);
							else
								parser.hooks.hotAcceptWithoutCallback.call(expr, requests);
						}
					}
				});
				parser.plugin("call module.hot.decline", expr => {
					if(!parser.state.compilation.hotUpdateChunkTemplate) return false;
					if(expr.arguments.length === 1) {
						const arg = parser.evaluateExpression(expr.arguments[0]);
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
							parser.state.module.addDependency(dep);
						});
					}
				});
				parser.plugin("expression module.hot", ParserHelpers.skipTraversal);
			});
		});
	}

};

const hotInitCode = Template.getFunctionContent(require("./HotModuleReplacement.runtime.js"));
