/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

class ReadFileChunkLoadingRuntimeModule extends RuntimeModule {
	constructor(chunk) {
		super("readFile chunk loading", 10);
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
			'// "0" means "already loaded", Promise means loading',
			"var installedChunks = {",
			Template.indent(
				chunk.ids.map(id => `${JSON.stringify(id)}: 0`).join(",\n")
			),
			"};",
			"",
			"// ReadFile + VM.run chunk loading for javascript",
			`${fn}.push(function(chunkId, promises) {`,
			Template.indent([
				"",
				"var installedChunkData = installedChunks[chunkId];",
				'if(installedChunkData !== 0) { // 0 means "already installed".',
				Template.indent([
					'// array of [resolve, reject, promise] means "currently loading"',
					"if(installedChunkData) {",
					Template.indent(["promises.push(installedChunkData[2]);"]),
					"} else {",
					Template.indent([
						"// load the chunk and return promise to it",
						"var promise = new Promise(function(resolve, reject) {",
						Template.indent([
							"installedChunkData = installedChunks[chunkId] = [resolve, reject];",
							`var filename = require('path').join(__dirname, ${
								RuntimeGlobals.getChunkScriptFilename
							}(chunkId));`,
							"require('fs').readFile(filename, 'utf-8', function(err, content) {",
							Template.indent([
								"if(err) return reject(err);",
								"var chunk = {};",
								"require('vm').runInThisContext('(function(exports, require, __dirname, __filename) {' + content + '\\n})', filename)" +
									"(chunk, require, require('path').dirname(filename), filename);",
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
								"var callbacks = [];",
								"for(var i = 0; i < chunkIds.length; i++) {",
								Template.indent([
									"if(installedChunks[chunkIds[i]])",
									Template.indent([
										"callbacks = callbacks.concat(installedChunks[chunkIds[i]][0]);"
									]),
									"installedChunks[chunkIds[i]] = 0;"
								]),
								"}",
								"for(i = 0; i < callbacks.length; i++)",
								Template.indent("callbacks[i]();")
							]),
							"});"
						]),
						"});",
						"promises.push(installedChunkData[2] = promise);"
					]),
					"}"
				]),
				"}"
			]),
			"})"
		]);
	}
}

module.exports = ReadFileChunkLoadingRuntimeModule;
