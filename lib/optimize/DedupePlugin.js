/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ConcatSource = require("webpack-core/lib/ConcatSource");
var TemplateArgumentDependency = require("../dependencies/TemplateArgumentDependency");

function DedupePlugin() {
}
module.exports = DedupePlugin;

DedupePlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation) {

		compilation.dependencyTemplates.set(TemplateArgumentDependency, new TemplateArgumentDependency.Template());

		compilation.plugin("after-optimize-tree", function(chunks, modules) {
			var modulesByHash = {};
			var allDups = [];
			modules.forEach(function(module) {
				if(!module.getSourceHash || !module.getAllModuleDependencies || !module.createTemplate || !module.getTemplateArguments || module.blocks.length > 0) return;
				var hash = module.getSourceHash();
				var dupModule = modulesByHash[hash];
				if(dupModule) {
					if(dupModule.duplicates) {
						dupModule.duplicates.push(module);
						module.duplicates = dupModule.duplicates;
					} else {
						allDups.push(module.duplicates = dupModule.duplicates = [dupModule, module]);
					}
				} else {
					modulesByHash[hash] = module;
				}
			});
			var entryChunks = chunks.filter(function(c) { return c.entry; });
			entryChunks.forEach(function(chunk) { // for each entry chunk
				var hasDeduplicatedModules = false;
				(function x(dups, roots, visited, chunk) {
					var currentDups = [];
					var currentRoots = [];
					chunk.modules.forEach(function(module) {
						if(module.duplicates) {
							if(!module.rootDuplicatesChunks)
								module.rootDuplicatesChunks = module.chunks.slice();
							var chunkIndex = module.rootDuplicatesChunks.indexOf(chunk);
							if(!module.rootDuplicates) module.rootDuplicates = [];
							var idx = currentDups.indexOf(module.duplicates);
							if(idx >= 0) {
								module.rootDuplicates[chunkIndex] = currentRoots[idx];
								module.rootDuplicates[chunkIndex].push(module);
								module.rootDuplicates[chunkIndex].commonModules =
									mergeCommonModules(module.rootDuplicates[chunkIndex].commonModules, module.getAllModuleDependencies());
								hasDeduplicatedModules = true;
							} else {
								idx = dups.indexOf(module.duplicates);
								if(idx < 0) {
									module.rootDuplicates[chunkIndex] = [module];
									module.rootDuplicates[chunkIndex].commonModules = module.getAllModuleDependencies();
									module.rootDuplicates[chunkIndex].initialCommonModulesLength = module.rootDuplicates[chunkIndex].commonModules.length;
									dups = dups.concat([module.duplicates]);
									roots = roots.concat([module.rootDuplicates[chunkIndex]]);
									currentDups = currentDups.concat([module.duplicates]);
									currentRoots = currentRoots.concat([module.rootDuplicates[chunkIndex]]);
								} else {
									module.rootDuplicates[chunkIndex] = roots[idx];
									module.rootDuplicates[chunkIndex].commonModules =
										mergeCommonModules(module.rootDuplicates[chunkIndex].commonModules, module.getAllModuleDependencies());
									hasDeduplicatedModules = true;
								}
							}
						}
					});
					chunk.chunks.forEach(function(chunk) {
						if(visited.indexOf(chunk) < 0)
							x(dups, roots, visited.concat(chunk), chunk);
					});

					currentRoots.forEach(function(roots) {
						var commonModules = roots.commonModules;
						var initialLength = roots.initialCommonModulesLength;
						if(initialLength !== commonModules.length) {
							var template = roots[0].createTemplate(commonModules, roots.slice());
							roots.template = template;
							chunk.addModule(template);
							template.addChunk(chunk);
							compilation.modules.push(template);
							hasDeduplicatedModules = true;
						}
					});
				}([], [], [], chunk));
				if(hasDeduplicatedModules)
					chunk.__DedupePluginHasDeduplicatedModules = true;
			});
		});
		function mergeCommonModules(commonModules, newModules) {
			return commonModules.filter(function(module) {
				return newModules.indexOf(module) >= 0;
			});
		}

		compilation.moduleTemplate.plugin("package", function(moduleSource, module, chunk) {
			if(!module.rootDuplicatesChunks || !chunk) return moduleSource;
			var chunkIndex = module.rootDuplicatesChunks.indexOf(chunk);
			if(!module.rootDuplicates || !module.rootDuplicates[chunkIndex]) return moduleSource;
			var rootDuplicates = module.rootDuplicates[chunkIndex];
			if(rootDuplicates.template) {
				rootDuplicates.template.addReason(module, {
					type: "template",
					request: module.request,
					templateModules: rootDuplicates.template.templateModules
				});
				rootDuplicates.template.reasons.sort(function(a, b) {
					if(a.request === b.request) return 0;
					return a.request < b.request ? -1 : 1;
				});
				var array = [rootDuplicates.template.id].concat(module.getTemplateArguments(rootDuplicates.template.templateModules).map(function(module) {
					if(typeof module.id !== "number")
						return "(function webpackMissingModule() { throw new Error(" + JSON.stringify("Cannot find module") + "); }())";
					return module.id;
				}));
				var source = new ConcatSource("[" + array.join(", ") + "]");
				return source;
			} else {
				rootDuplicates.sort(function(a, b) {
					return a.id - b.id;
				});
				if(module === rootDuplicates[0]) return moduleSource;
				var source = new ConcatSource("" + rootDuplicates[0].id);
				return source;
			}
		});
		compilation.plugin("chunk-hash", function(chunk, hash) {
			if(chunk.__DedupePluginHasDeduplicatedModules)
				hash.update("DedupePlugin (deduplication code)");
		});
		compilation.mainTemplate.plugin("add-module", function(source, chunk, hash, varModuleId, varModule) {
			// we don't need to test all nested chunks, because `__DedupePluginHasDeduplicatedModules`
			// is not set on entry chunks
			if(!chunk.__DedupePluginHasDeduplicatedModules) {
				return source;
			}
			return this.asString([
				"var _m = " + varModule + ";",
				"",
				"// Check if module is deduplicated",
				"switch(typeof _m) {",
				"case \"number\":",
				this.indent([
					"// Module is a copy of another module",
					"modules[" + varModuleId + "] = modules[_m];",
					"break;"
				]),
				"case \"object\":",
				this.indent([
					"// Module can be created from a template",
					"modules[" + varModuleId + "] = (function(_m) {",
					this.indent([
						"var args = _m.slice(1), templateId = _m[0];",
						"return function (a,b,c) {",
						this.indent([
							"modules[templateId].apply(this, [a,b,c].concat(args));"
						]),
						"};"
					]),
					"}(_m));",
					"break;"
				]),
				"default:",
				this.indent([
					"// Normal module",
					"modules[" + varModuleId + "] = _m;"
				]),
				"}"
			]);
		});
		compilation.mainTemplate.plugin("modules", function(orginalSource, chunk) {
			if(!chunk.__DedupePluginHasDeduplicatedModules) {
				return orginalSource;
			}
			var source = new ConcatSource();
			source.add("(function(modules) {\n");
			source.add(this.indent([
				"// Check all modules for deduplicated modules",
				"for(var i in modules) {",
				this.indent([
					"if(Object.prototype.hasOwnProperty.call(modules, i)) {",
					this.indent([
						"switch(typeof modules[i]) {",
						"case \"number\":",
						this.indent([
							"// Module is a copy of another module",
							"modules[i] = modules[modules[i]];",
							"break;"
						]),
						"case \"object\":",
						this.indent([
							"// Module can be created from a template",
							"modules[i] = (function(_m) {",
							this.indent([
								"var args = _m.slice(1), fn = modules[_m[0]];",
								"return function (a,b,c) {",
								this.indent([
									"fn.apply(null, [a,b,c].concat(args));"
								]),
								"};"
							]),
							"}(modules[i]));"
						]),
						"}"
					]),
					"}"
				]),
				"}",
				"return modules;"
			]));
			source.add("\n}(");
			source.add(orginalSource);
			source.add("))");
			return source;
		});
	});
};
