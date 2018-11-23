/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class ImportScriptsChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(chunk, outputOptions) {
		super("importScripts chunk loading", 10);
		this.chunk = chunk;
		this.outputOptions = outputOptions;
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { chunk } = this;
		const { globalObject, chunkCallbackName } = this.outputOptions;
		const fn = RuntimeGlobals.ensureChunkHandlers;
		return Template.asString([
			"// object to store loaded chunks",
			'// "1" means "already loaded"',
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 1`).join(",\n")
			),
			"};",
			"",
			"// importScripts chunk loading",
			`${fn}.push(function(chunkId, promises) {`,
			Template.indent([
				'// "1" is the signal for "already loaded"',
				"if(!installedChunks[chunkId]) {",
				Template.indent([
					"promises.push(Promise.resolve().then(function() {",
					Template.indent([
						`importScripts(${RuntimeGlobals.getChunkScriptFilename}(chunkId));`
					]),
					"}));"
				]),
				"}"
			]),
			"});",
			"",
			`${globalObject}[${JSON.stringify(
				chunkCallbackName
			)}] = function webpackChunkCallback(chunkIds, moreModules) {`,
			Template.indent([
				"for(var moduleId in moreModules) {",
				Template.indent([
					"if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {",
					Template.indent(
						`${
							RuntimeGlobals.moduleFactories
						}[moduleId] = moreModules[moduleId];`
					),
					"}"
				]),
				"}",
				"while(chunkIds.length)",
				Template.indent("installedChunks[chunkIds.pop()] = 1;")
			]),
			"};"
		]);
	}
}

module.exports = ImportScriptsChunkLoadingRuntimeModule;
