/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");

/** @typedef {import("../Compilation")} Compilation */

class JsonpExportMainTemplatePlugin {
	/**
	 * @param {string} name jsonp function name
	 */
	constructor(name) {
		this.name = name;
	}

	/**
	 * @param {Compilation} compilation the compilation instance
	 * @returns {void}
	 */
	apply(compilation) {
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			const name = mainTemplate.getAssetPath(this.name || "", {
				hash,
				chunk
			});
			return new ConcatSource(`${name}(`, source, ");");
		};

		mainTemplate.hooks.renderWithEntry.tap(
			"JsonpExportMainTemplatePlugin",
			onRenderWithEntry
		);

		chunkTemplate.hooks.renderWithEntry.tap(
			"JsonpExportMainTemplatePlugin",
			onRenderWithEntry
		);

		mainTemplate.hooks.hash.tap("JsonpExportMainTemplatePlugin", hash => {
			hash.update("jsonp export");
			hash.update(`${this.name}`);
		});
	}
}

module.exports = JsonpExportMainTemplatePlugin;
