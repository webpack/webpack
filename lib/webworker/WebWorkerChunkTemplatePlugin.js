/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("../Template");

class WebWorkerChunkTemplatePlugin {

	apply(chunkTemplate) {
		chunkTemplate.plugin("render", (modules, chunk) => {
			const chunkCallbackName = chunkTemplate.outputOptions.chunkCallbackName || Template.toIdentifier("webpackChunk" + (chunkTemplate.outputOptions.library || ""));
			const source = new ConcatSource();
			source.add(`self[${JSON.stringify(chunkCallbackName)}](${JSON.stringify(chunk.ids)},`);
			source.add(modules);
			source.add(")");
			return source;
		});
		chunkTemplate.plugin("hash", hash => {
			hash.update("webworker");
			hash.update("3");
			hash.update(`${chunkTemplate.outputOptions.chunkCallbackName}`);
			hash.update(`${chunkTemplate.outputOptions.library}`);
		});
	}
}
module.exports = WebWorkerChunkTemplatePlugin;
