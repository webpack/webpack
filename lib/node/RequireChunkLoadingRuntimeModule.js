/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class ReadFileChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(chunk) {
		super("require chunk loading", 10);
		this.chunk = chunk;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunk } = this;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		return Template.asString([
			"// object to store loaded chunks",
			'// "1" means "loaded", otherwise not loaded yet',
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 1`).join(",\n")
			),
			"};",
			"",
			"// require() chunk loading for javascript",
			`${fn}.push(function(chunkId, promises) {`,
			Template.indent([
				"",
				'// "0" is the signal for "already loaded"',
				"if(!installedChunks[chunkId]) {",
				Template.indent([
					`var chunk = require("./" + ${
						RuntimeGlobals.getChunkScriptFilename
					}(chunkId));`,
					"var moreModules = chunk.modules, chunkIds = chunk.ids;",
					"for(var moduleId in moreModules) {",
					Template.indent([
						"if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {",
						Template.indent([
							`${
								RuntimeGlobals.moduleFactories
							}[moduleId] = moreModules[moduleId];`
						]),
						"}"
					]),
					"}",
					"for(var i = 0; i < chunkIds.length; i++)",
					Template.indent("installedChunks[chunkIds[i]] = 1;")
				]),
				"}"
			]),
			"})"
		]);
	}
}

module.exports = ReadFileChunkLoadingRuntimeModule;
