/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HTML_TYPE } = require("../ModuleSourceTypeConstants");
const { HTML_MODULE_TYPE } = require("../ModuleTypeConstants");
const HtmlUrlDependency = require("../dependencies/HtmlUrlDependency");
const { compareModulesByFullName } = require("../util/comparators");
const HtmlGenerator = require("./HtmlGenerator");
const HtmlParser = require("./HtmlParser");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../NormalModuleFactory")} NormalModuleFactory */

class HtmlModulesPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"HtmlModulesPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					HtmlUrlDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					HtmlUrlDependency,
					new HtmlUrlDependency.Template()
				);

				normalModuleFactory.hooks.createParser
					.for(HTML_MODULE_TYPE)
					.tap(
						"HtmlModulesPlugin",
						(parserOptions) => new HtmlParser(parserOptions)
					);
				normalModuleFactory.hooks.createGenerator
					.for(HTML_MODULE_TYPE)
					.tap(
						"HtmlModulesPlugin",
						(generatorOptions) => new HtmlGenerator(generatorOptions)
					);

				compilation.hooks.contentHash.tap("HtmlModulesPlugin", (chunk) => {
					const {
						chunkGraph,
						outputOptions: {
							hashSalt,
							hashDigest,
							hashDigestLength,
							hashFunction
						}
					} = compilation;
					const modules = chunkGraph.getOrderedChunkModulesIterableBySourceType(
						chunk,
						HTML_TYPE,
						compareModulesByFullName(compilation.compiler)
					);
					if (modules) {
						const createHash = require("../util/createHash");

						const hash = createHash(hashFunction);
						if (hashSalt) hash.update(hashSalt);
						for (const module of modules) {
							hash.update(chunkGraph.getModuleHash(module, chunk.runtime));
						}
						const digest = hash.digest(hashDigest);

						const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");

						chunk.contentHash[HTML_TYPE] = nonNumericOnlyHash(
							digest,
							hashDigestLength
						);
					}
				});

				compilation.hooks.renderManifest.tap(
					"HtmlModulesPlugin",
					(result, options) => {
						const { chunkGraph } = compilation;
						const { chunk, codeGenerationResults } = options;

						const modules =
							chunkGraph.getOrderedChunkModulesIterableBySourceType(
								chunk,
								HTML_TYPE,
								compareModulesByFullName(compilation.compiler)
							);

						if (modules) {
							for (const module of modules) {
								const codeGenResult = codeGenerationResults.get(
									module,
									chunk.runtime
								);
								if (!codeGenResult) continue;

								const source = codeGenResult.sources.get(HTML_TYPE);
								if (!source) continue;

								let filenameTemplate;
								if (chunkGraph.isEntryModule(module)) {
									filenameTemplate =
										compilation.outputOptions.htmlFilename || "[name].html";
								} else {
									filenameTemplate =
										compilation.outputOptions.htmlChunkFilename ||
										"[name].html";
								}

								const { path: filename, info } = compilation.getPathWithInfo(
									filenameTemplate,
									{
										hash: options.hash,
										runtime: chunk.runtime,
										chunk,
										module,
										contentHashType: HTML_TYPE
									}
								);

								const { getUndoPath } = require("../util/identifier");

								const undoPath = getUndoPath(
									filename,
									compilation.outputOptions.path,
									false
								);

								const render = () => {
									const { ReplaceSource } = require("webpack-sources");
									const CssUrlDependency = require("../dependencies/CssUrlDependency");

									const publicPathAutoRegex = new RegExp(
										CssUrlDependency.PUBLIC_PATH_AUTO,
										"g"
									);
									const sourceContent = source.source().toString();
									if (publicPathAutoRegex.test(sourceContent)) {
										const replaceSource = new ReplaceSource(source);
										let match;
										publicPathAutoRegex.lastIndex = 0;
										while ((match = publicPathAutoRegex.exec(sourceContent))) {
											replaceSource.replace(
												match.index,
												match.index + match[0].length - 1,
												undoPath
											);
										}
										return replaceSource;
									}
									return source;
								};

								result.push({
									render,
									filename,
									info,
									identifier: `htmlModule-${module.identifier()}`,
									hash: chunkGraph.getModuleHash(module, chunk.runtime)
								});
							}
						}

						return result;
					}
				);
			}
		);
	}
}

module.exports = HtmlModulesPlugin;
