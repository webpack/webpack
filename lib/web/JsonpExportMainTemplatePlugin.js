/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { ConcatSource } = require("webpack-sources");
const { resolveTargetName, updateHashPath } = require("../util/templatePlugin");

class JsonpExportMainTemplatePlugin {
	/**
	 * @param {string|Function} name jsonp function name
	 */
	constructor(name) {
		/** @type {string|Function} */
		this.name = name;
	}

	apply(compilation) {
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			const name = resolveTargetName(mainTemplate, this.name, chunk, hash);
			return new ConcatSource(`${name}(`, source, ");");
		};

		for (const template of [mainTemplate, chunkTemplate]) {
			template.hooks.renderWithEntry.tap(
				"JsonpExportMainTemplatePlugin",
				onRenderWithEntry
			);
		}

		mainTemplate.hooks.globalHashPaths.tap(
			"JsonpExportMainTemplatePlugin",
			paths => {
				updateHashPath(compilation, this.name, paths);
				return paths;
			}
		);

		mainTemplate.hooks.hashForChunk.tap(
			"JsonpExportMainTemplatePlugin",
			(hash, chunk) => {
				const name = resolveTargetName(mainTemplate, this.name, chunk, hash);
				hash.update("jsonp export");
				hash.update(`${name}`);
			}
		);
	}
}

module.exports = JsonpExportMainTemplatePlugin;
