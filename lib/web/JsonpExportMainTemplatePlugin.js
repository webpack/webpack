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

		compilation.templatesPlugin("render-with-entry", (source, chunk, hash) => {
			const name = mainTemplate.applyPluginsWaterfall("asset-path", this.name || "", {
				hash: hash,
				chunk: chunk
			});
			return new ConcatSource(`${name}(`, source, ");");
		});

		mainTemplate.plugin("global-hash-paths", paths => {
			if(this.name) paths.push(this.name);
			return paths;
		});

		mainTemplate.plugin("hash", hash => {
			hash.update("jsonp export");
			hash.update(`${this.name}`);
		});
	}
}

module.exports = JsonpExportMainTemplatePlugin;
