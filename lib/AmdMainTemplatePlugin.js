/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */

"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("./Template");

class AmdMainTemplatePlugin {
	constructor(name) {
		this.name = name;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;

		compilation.templatesPlugin("render-with-entry", (source, chunk, hash) => {
			const externals = chunk.modules.filter((m) => m.external);
			const externalsDepsArray = JSON.stringify(externals.map((m) =>
				typeof m.request === "object" ? m.request.amd : m.request
			));
			const externalsArguments = externals.map((m) =>
				Template.toIdentifier(`__WEBPACK_EXTERNAL_MODULE_${m.id}__`)
			).join(", ");

			if(this.name) {
				const name = mainTemplate.applyPluginsWaterfall("asset-path", this.name, {
					hash,
					chunk
				});

				return new ConcatSource(
					`define(${JSON.stringify(name)}, ${externalsDepsArray}, function(${externalsArguments}) { return `, source, "});"
				);
			} else if(externalsArguments) {
				return new ConcatSource(`define(${externalsDepsArray}, function(${externalsArguments}) { return `, source, "});");
			} else {
				return new ConcatSource("define(function() { return ", source, "});");
			}
		});

		mainTemplate.plugin("global-hash-paths", (paths) => {
			if(this.name) paths.push(this.name);
			return paths;
		});

		mainTemplate.plugin("hash", (hash) => {
			hash.update("exports amd");
			hash.update(this.name);
		});
	}
}

module.exports = AmdMainTemplatePlugin;
