/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const CommonJsChunkFormatPlugin = require("../javascript/CommonJsChunkFormatPlugin");
const StartupChunkDependenciesPlugin = require("../runtime/StartupChunkDependenciesPlugin");
const CommonJsChunkLoadingPlugin = require("./CommonJsChunkLoadingPlugin");

/** @typedef {import("../Compiler")} Compiler */

class NodeTemplatePlugin {
	constructor(options) {
		this._options = options || {};
	}

	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		new StartupChunkDependenciesPlugin(this._options).apply(compiler);
		new CommonJsChunkFormatPlugin().apply(compiler);
		new CommonJsChunkLoadingPlugin(this._options).apply(compiler);
	}
}

module.exports = NodeTemplatePlugin;
