/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const mimeTypes = require("mime-types");
const path = require("path");
const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");
const createHash = require("../util/createHash");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/plugins/AssetModulesPluginGenerator").AssetModulesPluginGeneratorOptions} AssetModulesPluginGeneratorOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/Hash")} Hash */

const JS_TYPES = new Set(["javascript"]);
const JS_AND_ASSET_TYPES = new Set(["javascript", "asset"]);

class AssetGenerator extends Generator {
	/**
	 * @param {Compilation} compilation the compilation
	 * @param {AssetModulesPluginGeneratorOptions["dataUrl"]=} dataUrlOptions the options for the data url
	 * @param {string=} filename override for output.assetModuleFilename
	 */
	constructor(compilation, dataUrlOptions, filename) {
		super();
		this.compilation = compilation;
		this.dataUrlOptions = dataUrlOptions;
		this.filename = filename;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(
		module,
		{ runtime, chunkGraph, runtimeTemplate, runtimeRequirements, type }
	) {
		switch (type) {
			case "asset":
				return module.originalSource();
			default: {
				runtimeRequirements.add(RuntimeGlobals.module);

				const originalSource = module.originalSource();
				if (module.buildInfo.dataUrl) {
					let encodedSource;
					if (typeof this.dataUrlOptions === "function") {
						encodedSource = this.dataUrlOptions.call(
							null,
							originalSource.source(),
							{
								filename: module.nameForCondition(),
								module
							}
						);
					} else {
						const encoding = this.dataUrlOptions.encoding;
						const ext = path.extname(module.nameForCondition());
						const mimeType =
							this.dataUrlOptions.mimetype || mimeTypes.lookup(ext);

						if (!mimeType) {
							throw new Error(
								"DataUrl can't be generated automatically, " +
									`because there is no mimetype for "${ext}" in mimetype database. ` +
									'Either pass a mimetype via "generator.mimetype" or ' +
									'use type: "asset/resource" to create a resource file instead of a DataUrl'
							);
						}

						let encodedContent;
						switch (encoding) {
							case "base64": {
								encodedContent = originalSource.buffer().toString("base64");
								break;
							}
							case false: {
								const content = originalSource.source();
								if (typeof content === "string") {
									encodedContent = encodeURI(content);
								} else {
									encodedContent = encodeURI(content.toString("utf-8"));
								}
								break;
							}
							default:
								throw new Error(`Unsupported encoding '${encoding}'`);
						}

						encodedSource = `data:${mimeType}${
							encoding ? `;${encoding}` : ""
						},${encodedContent}`;
					}
					return new RawSource(
						`${RuntimeGlobals.module}.exports = ${JSON.stringify(
							encodedSource
						)};`
					);
				} else {
					const assetModuleFilename =
						this.filename || runtimeTemplate.outputOptions.assetModuleFilename;
					const hash = createHash(runtimeTemplate.outputOptions.hashFunction);
					if (runtimeTemplate.outputOptions.hashSalt) {
						hash.update(runtimeTemplate.outputOptions.hashSalt);
					}
					hash.update(originalSource.buffer());
					const fullHash = /** @type {string} */ (hash.digest(
						runtimeTemplate.outputOptions.hashDigest
					));
					const contentHash = fullHash.slice(
						0,
						runtimeTemplate.outputOptions.hashDigestLength
					);
					module.buildInfo.fullContentHash = fullHash;
					const {
						path: filename,
						info
					} = this.compilation.getAssetPathWithInfo(assetModuleFilename, {
						module,
						runtime,
						filename: module.nameForCondition(),
						chunkGraph,
						contentHash
					});
					module.buildInfo.filename = filename;
					module.buildInfo.assetInfo = info;

					runtimeRequirements.add(RuntimeGlobals.publicPath); // add __webpack_require__.p

					return new RawSource(
						`${RuntimeGlobals.module}.exports = ${
							RuntimeGlobals.publicPath
						} + ${JSON.stringify(filename)};`
					);
				}
			}
		}
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes(module) {
		if (module.buildInfo.dataUrl) {
			return JS_TYPES;
		} else {
			return JS_AND_ASSET_TYPES;
		}
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type) {
		switch (type) {
			case "asset": {
				const originalSource = module.originalSource();

				if (!originalSource) {
					return 0;
				}

				return originalSource.size();
			}
			default:
				if (module.buildInfo.dataUrl) {
					const originalSource = module.originalSource();

					if (!originalSource) {
						return 0;
					}

					// roughly for data url
					// Example: m.exports="data:image/png;base64,ag82/f+2=="
					// 4/3 = base64 encoding
					// 34 = ~ data url header + footer + rounding
					return originalSource.size() * 1.34 + 36;
				} else {
					// it's only estimated so this number is probably fine
					// Example: m.exports=r.p+"0123456789012345678901.ext"
					return 42;
				}
		}
	}

	/**
	 * @param {Hash} hash hash that will be modified
	 * @param {UpdateHashContext} updateHashContext context for updating hash
	 */
	updateHash(hash, { module }) {
		hash.update(module.buildInfo.dataUrl ? "data-url" : "resource");
	}
}

module.exports = AssetGenerator;
