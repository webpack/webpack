/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const mime = require("mime");
const path = require("path");
const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");
const RuntimeGlobals = require("../RuntimeGlobals");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/plugins/AssetModulesPlugin").AssetModulesPluginOptions} AssetModulesPluginOptions */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

/**
 * @type {Map<string|Buffer, string|null>}
 */
const dataUrlFnCache = new Map();

/**
 * @param {NormalModule} module the module
 * @param {AssetModulesPluginOptions} options the options to encode
 * @returns {boolean} should emit additional asset for the module
 */
const shouldEmitAsset = (module, options) => {
	const originalSource = module.originalSource();
	if (typeof options.dataUrl === "function") {
		return (
			options.dataUrl.call(null, module, module.nameForCondition()) === false
		);
	}

	if (options.dataUrl === false) {
		return true;
	}

	return originalSource.size() > options.dataUrl.maxSize;
};

/**
 * @param {AssetModulesPluginOptions} options the options to the encoder
 * @returns {AssetModulesPluginOptions} normalized options
 */
const prepareOptions = (options = {}) => {
	const dataUrl = options.dataUrl || {};

	if (options.dataUrl === false) {
		return {
			dataUrl: false
		};
	}

	if (typeof dataUrl === "function") {
		return {
			dataUrl: (source, resourcePath) => {
				if (dataUrlFnCache.has(source)) {
					return dataUrlFnCache.get(source);
				}

				const encoded = dataUrl.call(null, source, resourcePath);
				dataUrlFnCache.set(source, encoded);

				return encoded;
			}
		};
	}

	return {
		dataUrl: {
			encoding: "base64",
			maxSize: 8192,
			...dataUrl
		}
	};
};

const JS_TYPES = new Set(["javascript"]);
const JS_AND_ASSET_TYPES = new Set(["javascript", "asset"]);

class AssetGenerator extends Generator {
	/**
	 * @param {Compilation} compilation the compilation
	 * @param {AssetModulesPluginOptions} options the options
	 */
	constructor(compilation, options) {
		super();
		this.compilation = compilation;
		this.options = prepareOptions(options);
	}

	/**
	 * @param {NormalModule} module module for which the code should be generated
	 * @param {GenerateContext} generateContext context for generate
	 * @returns {Source} generated code
	 */
	generate(module, { chunkGraph, runtimeTemplate, runtimeRequirements, type }) {
		if (type === "asset") {
			return module.originalSource();
		}

		runtimeRequirements.add(RuntimeGlobals.module);

		if (!shouldEmitAsset(module, this.options)) {
			const originalSource = module.originalSource();
			let content = originalSource.source();

			let encodedSource;
			if (typeof this.options.dataUrl === "function") {
				encodedSource = this.options.dataUrl.call(
					null,
					content,
					module.nameForCondition()
				);
			} else {
				// @ts-ignore non-false dataUrl ensures in shouldEmitAsset above
				const encoding = this.options.dataUrl.encoding;
				const extname = path.extname(module.nameForCondition());
				// @ts-ignore non-false dataUrl ensures in shouldEmitAsset above
				const mimeType = this.options.dataUrl.mimetype || mime.getType(extname);

				if (encoding === "base64") {
					if (typeof content === "string") {
						content = Buffer.from(content);
					}

					content = content.toString("base64");
				}

				encodedSource = `data:${mimeType}${
					encoding ? `;${encoding}` : ""
				},${content}`;
			}
			return new RawSource(
				`${RuntimeGlobals.module}.exports = ${JSON.stringify(encodedSource)};`
			);
		}

		const filename = module.nameForCondition();
		const { assetModuleFilename } = runtimeTemplate.outputOptions;
		const url = this.compilation.getAssetPath(assetModuleFilename, {
			module,
			filename,
			chunkGraph
		});

		runtimeRequirements.add(RuntimeGlobals.publicPath); // add __webpack_require__.p

		// TODO: (hiroppy) use ESM
		return new RawSource(
			`${RuntimeGlobals.module}.exports = ${
				RuntimeGlobals.publicPath
			} + ${JSON.stringify(url)};`
		);
	}

	/**
	 * @param {NormalModule} module fresh module
	 * @returns {Set<string>} available types (do not mutate)
	 */
	getTypes(module) {
		if (shouldEmitAsset(module, this.options)) {
			return JS_AND_ASSET_TYPES;
		}

		return JS_TYPES;
	}

	/**
	 * @param {NormalModule} module the module
	 * @param {string=} type source type
	 * @returns {number} estimate size of the module
	 */
	getSize(module, type = module.type) {
		const originalSource = module.originalSource();

		if (!originalSource) {
			return 0;
		}

		if (type === "asset") {
			return originalSource.size();
		}

		if (shouldEmitAsset(module, this.options)) {
			// it's only estimated so this number is probably fine
			// Example: m.exports=r.p+"0123456789012345678901.ext"
			return 42;
		} else {
			// roughly for data url (a little bit tricky)
			return originalSource.size() * 1.5;
		}
	}
}

module.exports = AssetGenerator;
