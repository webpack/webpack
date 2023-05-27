/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const mimeTypes = require("mime-types");
const path = require("path");
const { RawSource } = require("webpack-sources");
const ConcatenationScope = require("../ConcatenationScope");
const Generator = require("../Generator");
const { ASSET_MODULE_TYPE } = require("../ModuleTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const createHash = require("../util/createHash");
const { makePathsRelative } = require("../util/identifier");
const nonNumericOnlyHash = require("../util/nonNumericOnlyHash");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/WebpackOptions").AssetGeneratorOptions} AssetGeneratorOptions */
/** @typedef {import("../../declarations/WebpackOptions").AssetModuleOutputPath} AssetModuleOutputPath */
/** @typedef {import("../../declarations/WebpackOptions").RawPublicPath} RawPublicPath */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Generator").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").ConcatenationBailoutReasonContext} ConcatenationBailoutReasonContext */
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
				case "javascriptModule":
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

const encodeDataUri = (encoding, source) => {
	let encodedContent;

	switch (encoding) {
		case "base64": {
			encodedContent = source.buffer().toString("base64");
			break;
		}
		case false: {
			const content = source.source();

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

	return encodedContent;
};

/**
 * @param {string} encoding encoding
 * @param {string} content content
 * @returns {Buffer} decoded content
 */
const decodeDataUriContent = (encoding, content) => {
	const isBase64 = encoding === "base64";

	if (isBase64) {
		return Buffer.from(content, "base64");
	}

	// If we can't decode return the original body
	try {
		return Buffer.from(decodeURIComponent(content), "ascii");
	} catch (_) {
		return Buffer.from(content, "ascii");
	}
};

const JS_TYPES = new Set(["javascript"]);
const JS_AND_ASSET_TYPES = new Set(["javascript", ASSET_MODULE_TYPE]);
const DEFAULT_ENCODING = "base64";

class AssetGenerator extends Generator {
	/**
	 * @param {AssetGeneratorOptions["dataUrl"]=} dataUrlOptions the options for the data url
	 * @param {string=} filename override for output.assetModuleFilename
	 * @param {RawPublicPath=} publicPath override for output.assetModulePublicPath
	 * @param {AssetModuleOutputPath=} outputPath the output path for the emitted file which is not included in the runtime import
	 * @param {boolean=} emit generate output asset
	 */
	constructor(dataUrlOptions, filename, publicPath, outputPath, emit) {
		super();
		this.dataUrlOptions = dataUrlOptions;
		this.filename = filename;
		this.publicPath = publicPath;
		this.outputPath = outputPath;
		this.emit = emit;
	}

	/**
	 * @param {NormalModule} module module
	 * @param {RuntimeTemplate} runtimeTemplate runtime template
	 * @returns {string} source file name
	 */
	getSourceFileName(module, runtimeTemplate) {
		return makePathsRelative(
			runtimeTemplate.compilation.compiler.context,
			module.matchResource || module.resource,
			runtimeTemplate.compilation.compiler.root
		).replace(/^\.\//, "");
	}

	/**
	 * @param {NormalModule} module module for which the bailout reason should be determined
	 * @param {ConcatenationBailoutReasonContext} context context
	 * @returns {string | undefined} reason why this module can't be concatenated, undefined when it can be concatenated
	 */
	getConcatenationBailoutReason(module, context) {
		return undefined;
	}

	/**
	 * @param {NormalModule} module module
	 * @returns {string} mime type
	 */
	getMimeType(module) {
		if (typeof this.dataUrlOptions === "function") {
			throw new Error(
				"This method must not be called when dataUrlOptions is a function"
			);
		}

		let mimeType = this.dataUrlOptions.mimetype;
		if (mimeType === undefined) {
			const ext = path.extname(module.nameForCondition());
			if (
				module.resourceResolveData &&
				module.resourceResolveData.mimetype !== undefined
			) {
				mimeType =
					module.resourceResolveData.mimetype +
					module.resourceResolveData.parameters;
			} else if (ext) {
				mimeType = mimeTypes.lookup(ext);

				if (typeof mimeType !== "string") {
					throw new Error(
						"DataUrl can't be generated automatically, " +
							`because there is no mimetype for "${ext}" in mimetype database. ` +
							'Either pass a mimetype via "generator.mimetype" or ' +
							'use type: "asset/resource" to create a resource file instead of a DataUrl'
					);
				}
			}
		}

		if (typeof mimeType !== "string") {
			throw new Error(
				"DataUrl can't be generated automatically. " +
					'Either pass a mimetype via "generator.mimetype" or ' +
					'use type: "asset/resource" to create a resource file instead of a DataUrl'
			);
		}

		return mimeType;
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(
		module,
		{
			runtime,
			concatenationScope,
			chunkGraph,
			runtimeTemplate,
			runtimeRequirements,
			type,
			getData
		}
	) {
		switch (type) {
			case ASSET_MODULE_TYPE:
				return /** @type {Source} */ (module.originalSource());
			default: {
				let content;
				const originalSource = /** @type {Source} */ (module.originalSource());
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
							encoding = DEFAULT_ENCODING;
						}
						const mimeType = this.getMimeType(module);

						let encodedContent;

						if (
							module.resourceResolveData &&
							module.resourceResolveData.encoding === encoding &&
							decodeDataUriContent(
								module.resourceResolveData.encoding,
								module.resourceResolveData.encodedContent
							).equals(originalSource.buffer())
						) {
							encodedContent = module.resourceResolveData.encodedContent;
						} else {
							encodedContent = encodeDataUri(encoding, originalSource);
						}

						encodedSource = `data:${mimeType}${
							encoding ? `;${encoding}` : ""
						},${encodedContent}`;
					}
					const data = getData();
					data.set("url", Buffer.from(encodedSource));
					content = JSON.stringify(encodedSource);
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
					const contentHash = nonNumericOnlyHash(
						fullHash,
						runtimeTemplate.outputOptions.hashDigestLength
					);
					module.buildInfo.fullContentHash = fullHash;
					const sourceFilename = this.getSourceFileName(
						module,
						runtimeTemplate
					);
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
					let assetPath;
					if (this.publicPath !== undefined) {
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
						assetInfo = mergeAssetInfo(assetInfo, info);
						assetPath = JSON.stringify(path + filename);
					} else {
						runtimeRequirements.add(RuntimeGlobals.publicPath); // add __webpack_require__.p
						assetPath = runtimeTemplate.concatenation(
							{ expr: RuntimeGlobals.publicPath },
							filename
						);
					}
					assetInfo = {
						sourceFilename,
						...assetInfo
					};
					if (this.outputPath) {
						const { path: outputPath, info } =
							runtimeTemplate.compilation.getAssetPathWithInfo(
								this.outputPath,
								{
									module,
									runtime,
									filename: sourceFilename,
									chunkGraph,
									contentHash
								}
							);
						assetInfo = mergeAssetInfo(assetInfo, info);
						filename = path.posix.join(outputPath, filename);
					}
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
					content = assetPath;
				}

				if (concatenationScope) {
					concatenationScope.registerNamespaceExport(
						ConcatenationScope.NAMESPACE_OBJECT_EXPORT
					);
					return new RawSource(
						`${runtimeTemplate.supportsConst() ? "const" : "var"} ${
							ConcatenationScope.NAMESPACE_OBJECT_EXPORT
						} = ${content};`
					);
				} else {
					runtimeRequirements.add(RuntimeGlobals.module);
					return new RawSource(
						`${RuntimeGlobals.module}.exports = ${content};`
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
			case ASSET_MODULE_TYPE: {
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
	updateHash(hash, { module, runtime, runtimeTemplate, chunkGraph }) {
		if (module.buildInfo.dataUrl) {
			hash.update("data-url");
			// this.dataUrlOptions as function should be pure and only depend on input source and filename
			// therefore it doesn't need to be hashed
			if (typeof this.dataUrlOptions === "function") {
				const ident = /** @type {{ ident?: string }} */ (this.dataUrlOptions)
					.ident;
				if (ident) hash.update(ident);
			} else {
				if (
					this.dataUrlOptions.encoding &&
					this.dataUrlOptions.encoding !== DEFAULT_ENCODING
				) {
					hash.update(this.dataUrlOptions.encoding);
				}
				if (this.dataUrlOptions.mimetype)
					hash.update(this.dataUrlOptions.mimetype);
				// computed mimetype depends only on module filename which is already part of the hash
			}
		} else {
			hash.update("resource");

			const pathData = {
				module,
				runtime,
				filename: this.getSourceFileName(module, runtimeTemplate),
				chunkGraph,
				contentHash: runtimeTemplate.contentHashReplacement
			};

			if (typeof this.publicPath === "function") {
				hash.update("path");
				const assetInfo = {};
				hash.update(this.publicPath(pathData, assetInfo));
				hash.update(JSON.stringify(assetInfo));
			} else if (this.publicPath) {
				hash.update("path");
				hash.update(this.publicPath);
			} else {
				hash.update("no-path");
			}

			const assetModuleFilename =
				this.filename || runtimeTemplate.outputOptions.assetModuleFilename;
			const { path: filename, info } =
				runtimeTemplate.compilation.getAssetPathWithInfo(
					assetModuleFilename,
					pathData
				);
			hash.update(filename);
			hash.update(JSON.stringify(info));
		}
	}
}

module.exports = AssetGenerator;
