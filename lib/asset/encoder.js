/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const mime = require("mime");
const path = require("path");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../../declarations/plugins/AssetModulesPlugin").AssetModulesPluginOptions} AssetModulesPluginOptions */
/** @typedef {import("../NormalModule")} NormalModule */

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

/**
 * @param {NormalModule} module a module to encode
 * @param {AssetModulesPluginOptions} options the options to the encoder
 * @returns {string|null} encoded source
 */
const encode = (module, options) => {
	if (shouldEmitAsset(module, options)) {
		return null;
	}

	const originalSource = module.originalSource();
	let content = originalSource.source();

	if (typeof options.dataUrl === "function") {
		return options.dataUrl.call(null, content, module.nameForCondition());
	}

	// @ts-ignore non-false dataUrl ensures in shouldEmitAsset above
	const encoding = options.dataUrl.encoding;
	const extname = path.extname(module.nameForCondition());
	// @ts-ignore non-false dataUrl ensures in shouldEmitAsset above
	const mimeType = options.dataUrl.mimetype || mime.getType(extname);

	if (encoding === "base64") {
		if (typeof content === "string") {
			content = Buffer.from(content);
		}

		content = content.toString("base64");
	}

	return `data:${mimeType}${encoding ? `;${encoding}` : ""},${content}`;
};

module.exports = {
	encode,
	shouldEmitAsset,
	prepareOptions
};
