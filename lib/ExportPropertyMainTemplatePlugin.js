/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const { ConcatSource } = require("webpack-sources");

const accessorToObjectAccess = accessor => {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
};

class ExportPropertyMainTemplatePlugin {
	constructor(property) {
		this.property = property;
	}

	apply(compilation) {
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			const postfix = `${accessorToObjectAccess([].concat(this.property))}`;
			return new ConcatSource(source, postfix);
		};

		for (const template of [mainTemplate, chunkTemplate]) {
			template.hooks.renderWithEntry.tap(
				"ExportPropertyMainTemplatePlugin",
				onRenderWithEntry
			);
		}

		mainTemplate.hooks.hash.tap("ExportPropertyMainTemplatePlugin", hash => {
			hash.update("export property");
			hash.update(`${this.property}`);
		});
	}
}

module.exports = ExportPropertyMainTemplatePlugin;
