/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("../Template");

class WebWorkerMainTemplatePlugin {
	apply(mainTemplate) {
		mainTemplate.plugin("local-vars", (source, chunk) => {
			if(chunk.getNumberOfChunks() > 0) {
				return mainTemplate.asString([
					source,
					"",
					"// object to store loaded chunks",
					"// \"1\" means \"already loaded\"",
					"var installedChunks = {",
					mainTemplate.indent(
						chunk.ids.map((id) => `${id}: 1`).join(",\n")
					),
					"};"
				]);
			}
			return source;
		});
		mainTemplate.plugin("require-ensure", (_, chunk, hash) => {
			const chunkFilename = mainTemplate.outputOptions.chunkFilename;
			return mainTemplate.asString([
				"promises.push(Promise.resolve().then(function() {",
				mainTemplate.indent([
					"// \"1\" is the signal for \"already loaded\"",
					"if(!installedChunks[chunkId]) {",
					mainTemplate.indent([
						"importScripts(" +
						mainTemplate.getAssetPath(JSON.stringify(chunkFilename), {
							hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
							hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
							chunk: {
								id: "\" + chunkId + \""
							}
						}) + ");"
					]),
					"}",
				]),
				"}));"
			]);
		});
		mainTemplate.plugin("bootstrap", (source, chunk, hash) => {
			if(chunk.getNumberOfChunks() > 0) {
				const chunkCallbackName = mainTemplate.outputOptions.chunkCallbackName || Template.toIdentifier("webpackChunk" + (mainTemplate.outputOptions.library || ""));
				return mainTemplate.asString([
					source,
					`self[${JSON.stringify(chunkCallbackName)}] = function webpackChunkCallback(chunkIds, moreModules) {`,
					mainTemplate.indent([
						"for(var moduleId in moreModules) {",
						mainTemplate.indent(mainTemplate.renderAddModule(hash, chunk, "moduleId", "moreModules[moduleId]")),
						"}",
						"while(chunkIds.length)",
						mainTemplate.indent("installedChunks[chunkIds.pop()] = 1;")
					]),
					"};"
				]);
			}
			return source;
		});
		mainTemplate.plugin("hot-bootstrap", (source, chunk, hash) => {
			const hotUpdateChunkFilename = mainTemplate.outputOptions.hotUpdateChunkFilename;
			const hotUpdateMainFilename = mainTemplate.outputOptions.hotUpdateMainFilename;
			const hotUpdateFunction = mainTemplate.outputOptions.hotUpdateFunction || Template.toIdentifier("webpackHotUpdate" + (mainTemplate.outputOptions.library || ""));
			const currentHotUpdateChunkFilename = mainTemplate.getAssetPath(JSON.stringify(hotUpdateChunkFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
				chunk: {
					id: "\" + chunkId + \""
				}
			});
			const currentHotUpdateMainFilename = mainTemplate.getAssetPath(JSON.stringify(hotUpdateMainFilename), {
				hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
				hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
			});

			return source + "\n" +
				`var parentHotUpdateCallback = self[${JSON.stringify(hotUpdateFunction)}];\n` +
				`self[${JSON.stringify(hotUpdateFunction)}] = ` +
				Template.getFunctionContent(require("./WebWorkerMainTemplate.runtime.js"))
				.replace(/\/\/\$semicolon/g, ";")
				.replace(/\$require\$/g, mainTemplate.requireFn)
				.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
				.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
				.replace(/\$hash\$/g, JSON.stringify(hash));
		});
		mainTemplate.plugin("hash", hash => {
			hash.update("webworker");
			hash.update("3");
			hash.update(`${mainTemplate.outputOptions.publicPath}`);
			hash.update(`${mainTemplate.outputOptions.filename}`);
			hash.update(`${mainTemplate.outputOptions.chunkFilename}`);
			hash.update(`${mainTemplate.outputOptions.chunkCallbackName}`);
			hash.update(`${mainTemplate.outputOptions.library}`);
		});
	}
}
module.exports = WebWorkerMainTemplatePlugin;
