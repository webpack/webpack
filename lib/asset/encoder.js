/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sergey Melyukov @smelukov
*/

"use strict";

const mime = require("mime");
const path = require("path");

/** @typedef {import("webpack-sources").Source} Source */
/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("./AssetModulesPlugin").GeneratorOptions} GeneratorOptions */

/**
 * @param {NormalModule} module a module to encode
 * @param {GeneratorOptions} options the options to the encoder
 * @returns {string|null} encoded source
 */
module.exports = (module, options) => {
	const originalSource = module.originalSource();
	let content = originalSource.source();

	if (typeof options.dataUrl === "function") {
		if (typeof content !== "string") {
			content = content.toString();
		}

		return options.dataUrl.call(null, content, module.resource);
	}

	const dataUrlOptions = {
		encoding: "base64",
		maxSize: 8192,
		...options.dataUrl
	};

	if (originalSource.size() > dataUrlOptions.maxSize) {
		return null;
	}

	const encoding = dataUrlOptions.encoding;
	const extname = path.extname(module.resource);
	const mimeType = dataUrlOptions.mimetype || mime.getType(extname);

	if (encoding === "base64") {
		if (typeof content === "string") {
			content = Buffer.from(content);
		}

		content = content.toString("base64");
	}

	return `data:${mimeType}${encoding ? `;${encoding}` : ""},${content}`;
};
