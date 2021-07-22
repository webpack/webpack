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
const { makePathsRelative } = require("../util/identifier");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").AssetGeneratorOptions} AssetGeneratorOptions */
/** @typedef {import("../../declarations/WebpackOptions").RawPublicPath} RawPublicPath */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */
/** @typedef {import("../util/Hash")} Hash */

const mergeMaybeArrays = (a, b) => {
	const set = new Set();
	if (Array.isArray(a)) for (const item of a) set.add(item);
	else set.add(a);
	if (Array.isArray(b)) for (const item of b) set.add(item);
	else set.add(b);
	return Array.from(set);
};

const mergeAssetInfo = (a, b) => {
	const result = { ...a, ...b };
	for (const key of Object.keys(a)) {
		if (key in b) {
			if (a[key] === b[key]) continue;
			switch (key) {
				case "fullhash":
				case "chunkhash":
				case "modulehash":
				case "contenthash":
					result[key] = mergeMaybeArrays(a[key], b[key]);
					break;
				case "immutable":
				case "development":
				case "hotModuleReplacement":
				case "javascriptModule	":
					result[key] = a[key] || b[key];
					break;
				case "related":
					result[key] = mergeRelatedInfo(a[key], b[key]);
					break;
				default:
					throw new Error(`Can't handle conflicting asset info for ${key}`);
			}
		}
	}
	return result;
};

const mergeRelatedInfo = (a, b) => {
	const result = { ...a, ...b };
	for (const key of Object.keys(a)) {
		if (key in b) {
			if (a[key] === b[key]) continue;
			result[key] = mergeMaybeArrays(a[key], b[key]);
		}
	}
	return result;
};

const JS_TYPES = new Set(["javascript"]);
const JS_AND_ASSET_TYPES = new Set(["javascript", "asset"]);

class AssetGenerator extends Generator {
	/**
	 * @param {AssetGeneratorOptions["dataUrl"]=} dataUrlOptions the options for the data url
	 * @param {string=} filename override for output.assetModuleFilename
	 * @param {RawPublicPath=} publicPath override for output.assetModulePublicPath
	 * @param {boolean=} emit generate output asset
	 */
	constructor(dataUrlOptions, filename, publicPath, emit) {
		super();
		this.dataUrlOptions = dataUrlOptions;
		this.filename = filename;
		this.publicPath = publicPath;
		this.emit = emit;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(
		module,
		{ runtime, chunkGraph, runtimeTemplate, runtimeRequirements, type, getData }
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
								filename: module.matchResource || module.resource,
								module
							}
						);
					} else {
						/** @type {string | false | undefined} */
						let encoding = this.dataUrlOptions.encoding;
						if (encoding === undefined) {
							if (
								module.resourceResolveData &&
								module.resourceResolveData.encoding !== undefined
							) {
								encoding = module.resourceResolveData.encoding;
							}
						}
						if (encoding === undefined) {
							encoding = "base64";
						}
						let ext;
						let mimeType = this.dataUrlOptions.mimetype;
						if (mimeType === undefined) {
							ext = path.extname(module.nameForCondition());
							if (
								module.resourceResolveData &&
								module.resourceResolveData.mimetype !== undefined
							) {
								mimeType =
									module.resourceResolveData.mimetype +
									module.resourceResolveData.parameters;
							} else if (ext) {
								mimeType = mimeTypes.lookup(ext);
							}
						}
						if (typeof mimeType !== "string") {
							throw new Error(
								"DataUrl can't be generated automatically, " +
									`because there is no mimetype for "${ext}" in mimetype database. ` +
									'Either pass a mimetype via "generator.mimetype" or ' +
									'use type: "asset/resource" to create a resource file instead of a DataUrl'
							);
						}

						let encodedContent;
						if (
							module.resourceResolveData &&
							module.resourceResolveData.encoding === encoding
						) {
							encodedContent = module.resourceResolveData.encodedContent;
						} else {
							switch (encoding) {
								case "base64": {
									encodedContent = originalSource.buffer().toString("base64");
									break;
								}
								case false: {
									const content = originalSource.source();

									if (typeof content !== "string") {
										encodedContent = content.toString("utf-8");
									}

									encodedContent = encodeURIComponent(encodedContent).replace(
										/[!'()*]/g,
										character => "%" + character.codePointAt(0).toString(16)
									);
									break;
								}
								default:
									throw new Error(`Unsupported encoding '${encoding}'`);
							}
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
					const fullHash = /** @type {string} */ (
						hash.digest(runtimeTemplate.outputOptions.hashDigest)
					);
					const contentHash = fullHash.slice(
						0,
						runtimeTemplate.outputOptions.hashDigestLength
					);
					module.buildInfo.fullContentHash = fullHash;
					const sourceFilename = makePathsRelative(
						runtimeTemplate.compilation.compiler.context,
						module.matchResource || module.resource,
						runtimeTemplate.compilation.compiler.root
					).replace(/^\.\//, "");
					let { path: filename, info: assetInfo } =
						runtimeTemplate.compilation.getAssetPathWithInfo(
							assetModuleFilename,
							{
								module,
								runtime,
								filename: sourceFilename,
								chunkGraph,
								contentHash
							}
						);
					let publicPath;
					if (this.publicPath) {
						const { path, info } =
							runtimeTemplate.compilation.getAssetPathWithInfo(
								this.publicPath,
								{
									module,
									runtime,
									filename: sourceFilename,
									chunkGraph,
									contentHash
								}
							);
						publicPath = JSON.stringify(path);
						assetInfo = mergeAssetInfo(assetInfo, info);
					} else {
						publicPath = RuntimeGlobals.publicPath;
						runtimeRequirements.add(RuntimeGlobals.publicPath); // add __webpack_require__.p
					}
					assetInfo = {
						sourceFilename,
						...assetInfo
					};
					module.buildInfo.filename = filename;
					module.buildInfo.assetInfo = assetInfo;
					if (getData) {
						// Due to code generation caching module.buildInfo.XXX can't used to store such information
						// It need to be stored in the code generation results instead, where it's cached too
						// TODO webpack 6 For back-compat reasons we also store in on module.buildInfo
						const data = getData();
						data.set("fullContentHash", fullHash);
						data.set("filename", filename);
						data.set("assetInfo", assetInfo);
					}

					return new RawSource(
						`${
							RuntimeGlobals.module
						}.exports = ${publicPath} + ${JSON.stringify(filename)};`
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
		if ((module.buildInfo && module.buildInfo.dataUrl) || this.emit === false) {
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
				if (module.buildInfo && module.buildInfo.dataUrl) {
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
