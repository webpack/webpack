/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

function accessorToObjectAccess(accessor) {
	return accessor.map(a => `[${JSON.stringify(a)}]`).join("");
}

class ExportPropertyMainTemplatePlugin {
	constructor(property) {
		this.property = property;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;
		compilation.templatesPlugin("render-with-entry", (source, chunk, hash) => {
			const postfix = `${accessorToObjectAccess([].concat(this.property))}`;
			return new ConcatSource(source, postfix);
		});
		mainTemplate.plugin("hash", hash => {
			hash.update("export property");
			hash.update(`${this.property}`);
		});
	}
}

module.exports = ExportPropertyMainTemplatePlugin;
