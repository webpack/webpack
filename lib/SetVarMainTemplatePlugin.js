/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

class SetVarMainTemplatePlugin {
	constructor(varExpression, copyObject) {
		this.varExpression = varExpression;
		this.copyObject = copyObject;
	}

	apply(compilation) {
		const mainTemplate = compilation.mainTemplate;
		compilation.templatesPlugin("render-with-entry", (source, chunk, hash) => {
			const varExpression = mainTemplate.applyPluginsWaterfall("asset-path", this.varExpression, {
				hash,
				chunk
			});
			if(this.copyObject) {
				return new ConcatSource(`(function(e, a) { for(var i in a) e[i] = a[i]; }(${varExpression}, `, source, "))");
			} else {
				const prefix = `${varExpression} =\n`;
				return new ConcatSource(prefix, source);
			}
		});
		mainTemplate.plugin("global-hash-paths", function(paths) {
			if(this.varExpression) paths.push(this.varExpression);
			return paths;
		});
		mainTemplate.plugin("hash", hash => {
			hash.update("set var");
			hash.update(`${this.varExpression}`);
			hash.update(`${this.copyObject}`);
		});
	}
}

module.exports = SetVarMainTemplatePlugin;
