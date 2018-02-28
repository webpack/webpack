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
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			const varExpression = mainTemplate.getAssetPath(this.varExpression, {
				hash,
				chunk
			});
			if (this.copyObject) {
				return new ConcatSource(
					`(function(e, a) { for(var i in a) e[i] = a[i]; }(${varExpression}, `,
					source,
					"))"
				);
			} else {
				const prefix = `${varExpression} =\n`;
				return new ConcatSource(prefix, source);
			}
		};

		for (const template of [mainTemplate, chunkTemplate]) {
			template.hooks.renderWithEntry.tap(
				"SetVarMainTemplatePlugin",
				onRenderWithEntry
			);
		}

		mainTemplate.hooks.globalHashPaths.tap(
			"SetVarMainTemplatePlugin",
			paths => {
				if (this.varExpression) paths.push(this.varExpression);
				return paths;
			}
		);
		mainTemplate.hooks.hash.tap("SetVarMainTemplatePlugin", hash => {
			hash.update("set var");
			hash.update(`${this.varExpression}`);
			hash.update(`${this.copyObject}`);
		});
	}
}

module.exports = SetVarMainTemplatePlugin;
