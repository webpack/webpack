/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const NodeChunkTemplatePlugin = require("./NodeChunkTemplatePlugin");
const NodeHotUpdateChunkTemplatePlugin = require("./NodeHotUpdateChunkTemplatePlugin");
const NodeMainTemplatePlugin = require("./NodeMainTemplatePlugin");

/** @typedef {import("../Compiler")} Compiler */

class NodeTemplatePlugin {
	constructor(options) {
		options = options || {};
		this.asyncChunkLoading = options.asyncChunkLoading;
	}

	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("NodeTemplatePlugin", compilation => {
			new NodeMainTemplatePlugin(this.asyncChunkLoading).apply(
				compilation.mainTemplate
			);
			new NodeChunkTemplatePlugin().apply(compilation.chunkTemplate);
			new NodeHotUpdateChunkTemplatePlugin().apply(
				compilation.hotUpdateChunkTemplate
			);
		});
	}
}

module.exports = NodeTemplatePlugin;
