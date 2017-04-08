/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NodeMainTemplatePlugin = require("./NodeMainTemplatePlugin");
const NodeChunkTemplatePlugin = require("./NodeChunkTemplatePlugin");
const NodeHotUpdateChunkTemplatePlugin = require("./NodeHotUpdateChunkTemplatePlugin");

class NodeTemplatePlugin {
	constructor(options) {
		options = options || {};
		this.asyncChunkLoading = options.asyncChunkLoading;
	}

	apply(compiler) {
		compiler.plugin("this-compilation", (compilation) => {
			compilation.mainTemplate.apply(new NodeMainTemplatePlugin(this.asyncChunkLoading));
			compilation.chunkTemplate.apply(new NodeChunkTemplatePlugin());
			compilation.hotUpdateChunkTemplate.apply(new NodeHotUpdateChunkTemplatePlugin());
		});
	}
}

module.exports = NodeTemplatePlugin;
