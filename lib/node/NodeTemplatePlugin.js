/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HotModuleReplacementPlugin = require("../HotModuleReplacementPlugin");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const NodeChunkTemplatePlugin = require("./NodeChunkTemplatePlugin");
const NodeHotUpdateChunkTemplatePlugin = require("./NodeHotUpdateChunkTemplatePlugin");
const ReadFileChunkLoadingRuntimeModule = require("./ReadFileChunkLoadingRuntimeModule");
const RequireChunkLoadingRuntimeModule = require("./RequireChunkLoadingRuntimeModule");

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
			new NodeChunkTemplatePlugin().apply(compilation.chunkTemplate);
			new NodeHotUpdateChunkTemplatePlugin().apply(
				compilation.hotUpdateChunkTemplate
			);

			const mainTemplate = compilation.mainTemplate;
			compilation.hooks.runtimeRequirementInTree
				.for(RuntimeGlobals.ensureChunkHandlers)
				.tap("NodeTemplatePlugin", (chunk, set) => {
					set.add(RuntimeGlobals.moduleFactories);
					set.add(RuntimeGlobals.getChunkScriptFilename);
					if (this.asyncChunkLoading) {
						compilation.addRuntimeModule(
							chunk,
							new ReadFileChunkLoadingRuntimeModule(chunk)
						);
					} else {
						compilation.addRuntimeModule(
							chunk,
							new RequireChunkLoadingRuntimeModule(chunk)
						);
					}
				});

			const { hotBootstrap } = HotModuleReplacementPlugin.getMainTemplateHooks(
				mainTemplate
			);

			hotBootstrap.tap("NodeTemplatePlugin", (source, chunk, hash) => {
				const hotUpdateChunkFilename =
					mainTemplate.outputOptions.hotUpdateChunkFilename;
				const hotUpdateMainFilename =
					mainTemplate.outputOptions.hotUpdateMainFilename;
				const chunkMaps = chunk.getChunkMaps();
				const currentHotUpdateChunkFilename = mainTemplate.getAssetPath(
					JSON.stringify(hotUpdateChunkFilename),
					{
						hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
						hashWithLength: length =>
							`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
						chunk: {
							id: '" + chunkId + "',
							hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
							hashWithLength: length => {
								const shortChunkHashMap = {};
								for (const chunkId of Object.keys(chunkMaps.hash)) {
									if (typeof chunkMaps.hash[chunkId] === "string") {
										shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substr(
											0,
											length
										);
									}
								}
								return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
							},
							name: `" + (${JSON.stringify(
								chunkMaps.name
							)}[chunkId]||chunkId) + "`
						}
					}
				);
				const currentHotUpdateMainFilename = mainTemplate.getAssetPath(
					JSON.stringify(hotUpdateMainFilename),
					{
						hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
						hashWithLength: length =>
							`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`
					}
				);
				return Template.getFunctionContent(
					this.asyncChunkLoading
						? require("./NodeMainTemplateAsync.runtime")
						: require("./NodeMainTemplate.runtime")
				)
					.replace(/\$onError\$/g, RuntimeGlobals.uncaughtErrorHandler)
					.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
					.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename);
			});
			mainTemplate.hooks.hash.tap("NodeTemplatePlugin", hash => {
				hash.update("node");
				hash.update("4");
			});
		});
	}
}

module.exports = NodeTemplatePlugin;
