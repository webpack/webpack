/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

class JsonpExportMainTemplatePlugin {
	constructor(name) {
		this.name = name;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;

		compilation.tapMainAndChunkTemplates("JsonpExportMainTemplatePlugin", "renderWithEntry", (source, chunk, hash) => {
			const name = mainTemplate.getAssetPath(this.name || "", {
				hash,
				chunk
			});
			return new ConcatSource(`${name}(`, source, ");");
		});

		mainTemplate.hooks.globalHashPaths.tap("JsonpExportMainTemplatePlugin", paths => {
			if(this.name) paths.push(this.name);
			return paths;
		});

		mainTemplate.hooks.hash.tap("JsonpExportMainTemplatePlugin", hash => {
			hash.update("jsonp export");
			hash.update(`${this.name}`);
		});
	}
}

module.exports = JsonpExportMainTemplatePlugin;
