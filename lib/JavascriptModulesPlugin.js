/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { SyncBailHook } = require("tapable");
const { ConcatSource } = require("webpack-sources");
const Compilation = require("./Compilation");
const JavascriptGenerator = require("./JavascriptGenerator");
const JavascriptParser = require("./JavascriptParser");
const Template = require("./Template");
const createHash = require("./util/createHash");

const compilationHooksMap = new WeakMap();

class JavascriptModulesPlugin {
	static getHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				shouldRender: new SyncBailHook(["module", "chunk"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	apply(compiler) {
		compiler.hooks.compilation.tap(
			"JavascriptModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				const hooks = JavascriptModulesPlugin.getHooks(compilation);
				hooks.shouldRender.tap("JavascriptModulesPlugin", module => {
					if (module.type === "javascript/auto") return true;
					if (module.type === "javascript/dynamic") return true;
					if (module.type === "javascript/esm") return true;
				});
				normalModuleFactory.hooks.createParser
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "auto");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "script");
					});
				normalModuleFactory.hooks.createParser
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", options => {
						return new JavascriptParser(options, "module");
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/auto")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/dynamic")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				normalModuleFactory.hooks.createGenerator
					.for("javascript/esm")
					.tap("JavascriptModulesPlugin", () => {
						return new JavascriptGenerator();
					});
				compilation.mainTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const hash = options.hash;
						const fullHash = options.fullHash;
						const outputOptions = options.outputOptions;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						const filenameTemplate =
							chunk.filenameTemplate || outputOptions.filename;

						const useChunkHash = compilation.mainTemplate.useChunkHash(chunk);

						result.push({
							render: () =>
								compilation.mainTemplate.render(
									hash,
									chunk,
									moduleTemplates.javascript,
									dependencyTemplates
								),
							filenameTemplate,
							pathOptions: {
								noChunkHash: !useChunkHash,
								contentHashType: "javascript",
								chunk
							},
							identifier: `chunk${chunk.id}`,
							hash: useChunkHash ? chunk.hash : fullHash
						});
						return result;
					}
				);
				compilation.mainTemplate.hooks.modules.tap(
					"JavascriptModulesPlugin",
					(source, chunk, hash, moduleTemplate, dependencyTemplates) => {
						return Template.renderChunkModules(
							chunk,
							m => typeof m.source === "function",
							moduleTemplate,
							dependencyTemplates,
							"/******/ "
						);
					}
				);
				compilation.chunkTemplate.hooks.renderManifest.tap(
					"JavascriptModulesPlugin",
					(result, options) => {
						const chunk = options.chunk;
						const outputOptions = options.outputOptions;
						const moduleTemplates = options.moduleTemplates;
						const dependencyTemplates = options.dependencyTemplates;

						let filenameTemplate;
						if (chunk.filenameTemplate) {
							filenameTemplate = chunk.filenameTemplate;
						} else if (chunk.isOnlyInitial()) {
							filenameTemplate = outputOptions.filename;
						} else {
							filenameTemplate = outputOptions.chunkFilename;
						}

						result.push({
							render: () =>
								this.renderJavascript(
									compilation.chunkTemplate,
									chunk,
									moduleTemplates.javascript,
									dependencyTemplates
								),
							filenameTemplate,
							pathOptions: {
								chunk,
								contentHashType: "javascript"
							},
							identifier: `chunk${chunk.id}`,
							hash: chunk.hash
						});

						return result;
					}
				);
				compilation.hooks.contentHash.tap("JavascriptModulesPlugin", chunk => {
					const outputOptions = compilation.outputOptions;
					const {
						hashSalt,
						hashDigest,
						hashDigestLength,
						hashFunction
					} = outputOptions;
					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);
					const template = chunk.hasRuntime()
						? compilation.mainTemplate
						: compilation.chunkTemplate;
					template.updateHashForChunk(hash, chunk);
					for (const m of chunk.modulesIterable) {
						if (typeof m.source === "function") {
							hash.update(m.hash);
						}
					}
					chunk.contentHash.javascript = hash
						.digest(hashDigest)
						.substr(0, hashDigestLength);
				});
			}
		);
	}

	renderJavascript(chunkTemplate, chunk, moduleTemplate, dependencyTemplates) {
		const moduleSources = Template.renderChunkModules(
			chunk,
			m => typeof m.source === "function",
			moduleTemplate,
			dependencyTemplates
		);
		const core = chunkTemplate.hooks.modules.call(
			moduleSources,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);
		let source = chunkTemplate.hooks.render.call(
			core,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);
		if (chunk.hasEntryModule()) {
			source = chunkTemplate.hooks.renderWithEntry.call(source, chunk);
		}
		chunk.rendered = true;
		return new ConcatSource(source, ";");
	}
}

module.exports = JavascriptModulesPlugin;
