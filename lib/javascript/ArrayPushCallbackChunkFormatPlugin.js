/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("../HotUpdateChunk");
const Template = require("../Template");
const { getEntryInfo } = require("../web/JsonpHelpers");
const {
	chunkHasJs,
	getCompilationHooks
} = require("./JavascriptModulesPlugin");

/** @typedef {import("../Compiler")} Compiler */

class ArrayPushCallbackChunkFormatPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"ArrayPushCallbackChunkFormatPlugin",
			compilation => {
				const hooks = getCompilationHooks(compilation);
				hooks.renderChunk.tap(
					"ArrayPushCallbackChunkFormatPlugin",
					(modules, renderContext) => {
						const { chunk, chunkGraph, runtimeTemplate } = renderContext;
						const hotUpdateChunk =
							chunk instanceof HotUpdateChunk ? chunk : null;
						const globalObject = runtimeTemplate.outputOptions.globalObject;
						const source = new ConcatSource();
						const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(
							chunk
						);
						const runtimePart =
							runtimeModules.length > 0 &&
							Template.renderChunkRuntimeModules(runtimeModules, renderContext);
						if (hotUpdateChunk) {
							const hotUpdateGlobal =
								runtimeTemplate.outputOptions.hotUpdateGlobal;
							source.add(
								`${globalObject}[${JSON.stringify(hotUpdateGlobal)}](`
							);
							source.add(`${JSON.stringify(chunk.id)},`);
							source.add(modules);
							if (runtimePart) {
								source.add(",\n");
								source.add(runtimePart);
							}
							source.add(")");
						} else {
							const chunkLoadingGlobal =
								runtimeTemplate.outputOptions.chunkLoadingGlobal;
							source.add(
								`(${globalObject}[${JSON.stringify(
									chunkLoadingGlobal
								)}] = ${globalObject}[${JSON.stringify(
									chunkLoadingGlobal
								)}] || []).push([`
							);
							source.add(`${JSON.stringify(chunk.ids)},`);
							source.add(modules);
							const entries = getEntryInfo(chunkGraph, chunk, c =>
								chunkHasJs(c, chunkGraph)
							);
							const entriesPart =
								entries.length > 0 && `,${JSON.stringify(entries)}`;
							if (runtimePart || entriesPart) {
								source.add(",\n");
								source.add(runtimePart || "0");
							}
							if (entriesPart) {
								source.add(entriesPart);
							}
							source.add("])");
						}
						return source;
					}
				);
				hooks.chunkHash.tap(
					"ArrayPushCallbackChunkFormatPlugin",
					(chunk, hash, { chunkGraph, runtimeTemplate }) => {
						if (chunk.hasRuntime()) return;
						hash.update("ArrayPushCallbackChunkFormatPlugin");
						hash.update("1");
						hash.update(
							JSON.stringify(
								getEntryInfo(chunkGraph, chunk, c => chunkHasJs(c, chunkGraph))
							)
						);
						hash.update(`${runtimeTemplate.outputOptions.chunkLoadingGlobal}`);
						hash.update(`${runtimeTemplate.outputOptions.hotUpdateGlobal}`);
						hash.update(`${runtimeTemplate.outputOptions.globalObject}`);
					}
				);
			}
		);
	}
}

module.exports = ArrayPushCallbackChunkFormatPlugin;
