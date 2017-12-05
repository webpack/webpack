/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

module.exports = class NodeMainTemplatePlugin {
	constructor(asyncChunkLoading) {
		this.asyncChunkLoading = asyncChunkLoading;
	}

	apply(mainTemplate) {
		const asyncChunkLoading = this.asyncChunkLoading;
		mainTemplate.plugin("local-vars", (source, chunk) => {
			if(chunk.getNumberOfChunks() > 0) {
				return mainTemplate.asString([
					source,
					"",
					"// object to store loaded chunks",
					"// \"0\" means \"already loaded\"",
					"var installedChunks = {",
					mainTemplate.indent(chunk.ids.map((id) => `${id}: 0`).join(",\n")),
					"};"
				]);
			}
			return source;
		});
		mainTemplate.plugin("require-extensions", (source, chunk) => {
			if(chunk.getNumberOfChunks() > 0) {
				return mainTemplate.asString([
					source,
					"",
					"// uncatched error handler for webpack runtime",
					`${mainTemplate.requireFn}.oe = function(err) {`,
					mainTemplate.indent([
						"process.nextTick(function() {",
						mainTemplate.indent("throw err; // catch this error by using System.import().catch()"),
						"});"
					]),
					"};"
				]);
			}
			return source;
		});
		mainTemplate.plugin("require-ensure", (source, chunk, hash) => {
			const chunkFilename = mainTemplate.outputOptions.chunkFilename;
			const chunkMaps = chunk.getChunkMaps();
			const insertMoreModules = [
				"var moreModules = chunk.modules, chunkIds = chunk.ids;",
				"for(var moduleId in moreModules) {",
				mainTemplate.indent(mainTemplate.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
				"}"
			];
			if(asyncChunkLoading) {
				return mainTemplate.asString([
					source,
					"",
					"// ReadFile + VM.run chunk loading for javascript",
					"",
					"var installedChunkData = installedChunks[chunkId];",
					"if(installedChunkData !== 0) { // 0 means \"already installed\".",
					mainTemplate.indent([
						"// array of [resolve, reject, promise] means \"currently loading\"",
						"if(installedChunkData) {",
						mainTemplate.indent([
							"promises.push(installedChunkData[2]);"
						]),
						"} else {",
						mainTemplate.indent([
							"// load the chunk and return promise to it",
							"var promise = new Promise(function(resolve, reject) {",
							mainTemplate.indent([
								"installedChunkData = installedChunks[chunkId] = [resolve, reject];",
								"var filename = __dirname + " + mainTemplate.getAssetPath(JSON.stringify(`/${chunkFilename}`), {
									hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
									hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
									chunk: {
										id: "\" + chunkId + \"",
										hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
										hashWithLength: (length) => {
											const shortChunkHashMap = {};
											Object.keys(chunkMaps.hash).forEach((chunkId) => {
												if(typeof chunkMaps.hash[chunkId] === "string")
													shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
											});
											return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
										},
										name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`
									}
								}) + ";",
								"require('fs').readFile(filename, 'utf-8',  function(err, content) {",
								mainTemplate.indent([
									"if(err) return reject(err);",
									"var chunk = {};",
									"require('vm').runInThisContext('(function(exports, require, __dirname, __filename) {' + content + '\\n})', filename)" +
									"(chunk, require, require('path').dirname(filename), filename);"
								].concat(insertMoreModules).concat([
									"var callbacks = [];",
									"for(var i = 0; i < chunkIds.length; i++) {",
									mainTemplate.indent([
										"if(installedChunks[chunkIds[i]])",
										mainTemplate.indent([
											"callbacks = callbacks.concat(installedChunks[chunkIds[i]][0]);"
										]),
										"installedChunks[chunkIds[i]] = 0;"
									]),
									"}",
									"for(i = 0; i < callbacks.length; i++)",
									mainTemplate.indent("callbacks[i]();")
								])),
								"});"
							]),
							"});",
							"promises.push(installedChunkData[2] = promise);"
						]),
						"}"
					]),
					"}"
				]);
			} else {
				const request = mainTemplate.getAssetPath(JSON.stringify(`./${chunkFilename}`), {
					hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
					hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
					chunk: {
						id: "\" + chunkId + \"",
						hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
						hashWithLength: (length) => {
							const shortChunkHashMap = {};
							Object.keys(chunkMaps.hash).forEach((chunkId) => {
								if(typeof chunkMaps.hash[chunkId] === "string")
									shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
							});
							return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
						},
						name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`
					}
				});
				return mainTemplate.asString([
					source,
					"",
					"// require() chunk loading for javascript",
					"",
					"// \"0\" is the signal for \"already loaded\"",
					"if(installedChunks[chunkId] !== 0) {",
					mainTemplate.indent([
						`var chunk = require(${request});`
					].concat(insertMoreModules).concat([
						"for(var i = 0; i < chunkIds.length; i++)",
						mainTemplate.indent("installedChunks[chunkIds[i]] = 0;")
					])),
					"}",
				]);
			}
		});
		mainTemplate.plugin("hot-bootstrap", (source, chunk, hash) => {
			const hotUpdateChunkFilename = mainTemplate.outputOptions.hotUpdateChunkFilename;
			const hotUpdateMainFilename = mainTemplate.outputOptions.hotUpdateMainFilename;
			const chunkMaps = chunk.getChunkMaps();
			const currentHotUpdateChunkFilename = mainTemplate.getAssetPath(JSON.stringify(hotUpdateChunkFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
				chunk: {
					id: "\" + chunkId + \"",
					hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
					hashWithLength: (length) => {
						const shortChunkHashMap = {};
						Object.keys(chunkMaps.hash).forEach((chunkId) => {
							if(typeof chunkMaps.hash[chunkId] === "string")
								shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(0, length);
						});
						return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
					},
					name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`
				}
			});
			const currentHotUpdateMainFilename = mainTemplate.getAssetPath(JSON.stringify(hotUpdateMainFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`
			});
			return Template.getFunctionContent(asyncChunkLoading ? require("./NodeMainTemplateAsync.runtime.js") : require("./NodeMainTemplate.runtime.js"))
				.replace(/\$require\$/g, mainTemplate.requireFn)
				.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
				.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename);
		});
		mainTemplate.plugin("hash", hash => {
			hash.update("node");
			hash.update("3");
			hash.update(mainTemplate.outputOptions.filename + "");
			hash.update(mainTemplate.outputOptions.chunkFilename + "");
		});
	}
};
