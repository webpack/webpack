/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author webpack contributors
*/

"use strict";

const { RawSource, ReplaceSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const NormalModule = require("../NormalModule");
const HtmlLinkDependency = require("../dependencies/HtmlLinkDependency");
const HtmlScriptDependency = require("../dependencies/HtmlScriptDependency");
const HtmlUrlDependency = require("../dependencies/HtmlUrlDependency");
const createHash = require("../util/createHash");
const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");
const removeBOM = require("../util/removeBOM");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../Chunk")} Chunk */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../CodeGenerationResults")} CodeGenerationResults */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildInfo} BuildInfo */
/** @typedef {import("../NormalModule")} NormalModule_ */

const PLUGIN_NAME = "HtmlModulesPlugin";

class HtmlModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// Register dependency factories and templates
				compilation.dependencyFactories.set(
					HtmlScriptDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlScriptDependency,
					new HtmlScriptDependency.Template()
				);
				compilation.dependencyFactories.set(
					HtmlLinkDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlLinkDependency,
					new HtmlLinkDependency.Template()
				);
				compilation.dependencyFactories.set(
					HtmlUrlDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlUrlDependency,
					new HtmlUrlDependency.Template()
				);

				// Register parser and generator for the HTML module type
				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlParser());

				normalModuleFactory.hooks.createGenerator
					.for(HTML_MODULE_TYPE)
					.tap(PLUGIN_NAME, () => new HtmlGenerator());

				// Strip BOM from HTML source
				NormalModule.getCompilationHooks(compilation).processResult.tap(
					PLUGIN_NAME,
					(result, module) => {
						if (module.type === HTML_MODULE_TYPE) {
							const [source, ...rest] = result;
							return [removeBOM(source), ...rest];
						}
						return result;
					}
				);

				// Content hash for HTML chunks
				compilation.hooks.contentHash.tap(PLUGIN_NAME, (chunk) => {
					const {
						chunkGraph,
						outputOptions: {
							hashSalt,
							hashDigest,
							hashDigestLength,
							hashFunction
						}
					} = compilation;

					if (!chunkGraph.getChunkModulesIterableBySourceType(chunk, "html")) {
						return;
					}

					const hash = createHash(hashFunction);
					if (hashSalt) hash.update(hashSalt);

					const modules = chunkGraph.getChunkModulesIterableBySourceType(
						chunk,
						"html"
					);
					if (modules) {
						for (const module of modules) {
							hash.update(chunkGraph.getModuleHash(module, chunk.runtime));
						}
					}

					const digest = hash.digest(hashDigest);
					chunk.contentHash.html = nonNumericOnlyHash(digest, hashDigestLength);
				});

				// Render manifest - emit HTML files with resolved dependency paths
				compilation.hooks.renderManifest.tap(PLUGIN_NAME, (result, options) => {
					const { chunkGraph } = compilation;
					const { chunk, codeGenerationResults } = options;

					if (chunk instanceof HotUpdateChunk) return result;

					const modules = chunkGraph.getChunkModulesIterableBySourceType(
						chunk,
						"html"
					);

					if (modules) {
						for (const module of modules) {
							result.push({
								render: () =>
									this._renderHtmlModule(
										/** @type {NormalModule_} */ (module),
										chunk,
										compilation,
										codeGenerationResults
									),
								filename: /** @type {string} */ (
									chunk.name ? `${chunk.name}.html` : `${chunk.id}.html`
								),
								info: { htmlModule: true },
								identifier: `html${chunk.id}`,
								hash: chunk.contentHash.html
							});
						}
					}

					return result;
				});
			}
		);
	}

	/**
	 * Render an HTML module, replacing dependency paths with resolved output filenames
	 * @param {NormalModule_} module the HTML module
	 * @param {Chunk} chunk the chunk
	 * @param {import("../Compilation")} compilation the compilation
	 * @param {CodeGenerationResults} codeGenerationResults code gen results
	 * @returns {Source} rendered HTML source
	 */
	_renderHtmlModule(module, chunk, compilation, codeGenerationResults) {
		const { chunkGraph, moduleGraph } = compilation;
		const buildInfo = /** @type {BuildInfo} */ (module.buildInfo);
		const htmlSource = buildInfo && buildInfo.htmlSource;

		if (!htmlSource || typeof htmlSource !== "string") {
			return new RawSource("");
		}

		const replaceSource = new ReplaceSource(new RawSource(htmlSource));

		for (const dep of module.dependencies) {
			const depModule = moduleGraph.getModule(dep);
			if (!depModule) continue;

			if (dep instanceof HtmlScriptDependency) {
				// For script dependencies, find the JS file in the dep module's chunks
				const filename = this._getModuleFilename(depModule, chunkGraph, ".js");
				if (filename && dep.range) {
					replaceSource.replace(dep.range[0], dep.range[1] - 1, filename);
				}
			} else if (dep instanceof HtmlLinkDependency) {
				if (dep.linkAttributes.rel === "stylesheet") {
					// For stylesheet links, find the CSS file
					const filename = this._getModuleFilename(
						depModule,
						chunkGraph,
						".css"
					);
					if (filename && dep.range) {
						replaceSource.replace(dep.range[0], dep.range[1] - 1, filename);
					}
				} else {
					// For other links (icons etc), look for asset URL
					const url = this._getAssetUrl(
						depModule,
						chunk,
						codeGenerationResults
					);
					if (url && dep.range) {
						replaceSource.replace(dep.range[0], dep.range[1] - 1, url);
					}
				}
			} else if (dep instanceof HtmlUrlDependency) {
				// For URL dependencies (img src, etc), look for asset URL
				const url = this._getAssetUrl(depModule, chunk, codeGenerationResults);
				if (url && dep.range) {
					replaceSource.replace(dep.range[0], dep.range[1] - 1, url);
				}
			}
		}

		return replaceSource;
	}

	/**
	 * Get the output filename for a module from its chunks
	 * @param {Module} module the module
	 * @param {ChunkGraph} chunkGraph the chunk graph
	 * @param {string} extension preferred extension
	 * @returns {string | undefined} the filename
	 */
	_getModuleFilename(module, chunkGraph, extension) {
		const chunks = chunkGraph.getModuleChunksIterable(module);
		let fallback;
		for (const chunk of chunks) {
			for (const file of chunk.files) {
				if (file.endsWith(extension)) {
					return file;
				}
				if (!fallback) fallback = file;
			}
		}
		return fallback;
	}

	/**
	 * Get the asset URL for a module (for asset/resource modules)
	 * @param {Module} module the module
	 * @param {Chunk} chunk the chunk for runtime context
	 * @param {CodeGenerationResults} codeGenerationResults code gen results
	 * @returns {string | undefined} the asset URL
	 */
	_getAssetUrl(module, chunk, codeGenerationResults) {
		try {
			const codeGen = codeGenerationResults.get(module, chunk.runtime);
			if (codeGen && codeGen.data) {
				// Prefer filename (raw path without public path expression)
				const filename = codeGen.data.get("filename");
				if (filename) {
					return String(filename);
				}
				// Asset modules store their URL in data.url as { "javascript": path, "css-url": path }
				const url = codeGen.data.get("url");
				if (url && typeof url === "object") {
					// Prefer css-url (actual URL string) over javascript (JS expression)
					if (url["css-url"] !== undefined) {
						return String(url["css-url"]);
					}
					const keys = Object.keys(url);
					if (keys.length > 0) {
						return String(url[keys[0]]);
					}
				} else if (url) {
					return String(url);
				}
			}
		} catch (_err) {
			// Module may not have code generation results
		}
		return undefined;
	}
}

module.exports = HtmlModulesPlugin;
