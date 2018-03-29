/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author @daurnimator
*/
"use strict";

const { ConcatSource } = require("webpack-sources");

class ReturnMainTemplatePlugin {
	apply(compilation) {
		const { mainTemplate, chunkTemplate } = compilation;

		const onRenderWithEntry = (source, chunk, hash) => {
			return new ConcatSource("return ", source, ";");
		};

		for (const template of [mainTemplate, chunkTemplate]) {
			template.hooks.renderWithEntry.tap(
				"ReturnMainTemplatePlugin",
				onRenderWithEntry
			);
		}

		mainTemplate.hooks.hash.tap("ReturnMainTemplatePlugin", hash => {
			hash.update("return export");
		});
	}
}

module.exports = ReturnMainTemplatePlugin;
