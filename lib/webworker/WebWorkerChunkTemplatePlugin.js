/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;
const Template = require("../Template");

class WebWorkerChunkTemplatePlugin {

	apply(chunkTemplate) {
		chunkTemplate.plugin("render", function(modules, chunk) {
			const chunkCallbackName = this.outputOptions.chunkCallbackName || Template.toIdentifier("webpackChunk" + (this.outputOptions.library || ""));
			const source = new ConcatSource();
			source.add(`${chunkCallbackName}(${JSON.stringify(chunk.ids)},`);
			source.add(modules);
			source.add(")");
			return source;
		});
		chunkTemplate.plugin("hash", function(hash) {
			hash.update("webworker");
			hash.update("3");
			hash.update(`${this.outputOptions.chunkCallbackName}`);
			hash.update(`${this.outputOptions.library}`);
		});
	}
}
module.exports = WebWorkerChunkTemplatePlugin;
