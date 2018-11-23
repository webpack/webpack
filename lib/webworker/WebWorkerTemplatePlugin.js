/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HotModuleReplacementPlugin = require("../HotModuleReplacementPlugin");
const RuntimeGlobals = require("../RuntimeGlobals");
const Template = require("../Template");
const WebWorkerChunkTemplatePlugin = require("./WebWorkerChunkTemplatePlugin");
const WebWorkerHotUpdateChunkTemplatePlugin = require("./WebWorkerHotUpdateChunkTemplatePlugin");

/** @typedef {import("../Compiler")} Compiler */

class WebWorkerTemplatePlugin {
	/**
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			"WebWorkerTemplatePlugin",
			compilation => {
				new WebWorkerChunkTemplatePlugin().apply(compilation.chunkTemplate);
				new WebWorkerHotUpdateChunkTemplatePlugin().apply(
					compilation.hotUpdateChunkTemplate
				);

				compilation.hooks.runtimeRequirementInTree.for(
					RuntimeGlobals.ensureChunkHandlers
				);

				const mainTemplate = compilation.mainTemplate;
				const {
					hotBootstrap
				} = HotModuleReplacementPlugin.getMainTemplateHooks(mainTemplate);
				hotBootstrap.tap(
					"WebWorkerMainTemplatePlugin",
					(source, chunk, hash) => {
						const hotUpdateChunkFilename =
							mainTemplate.outputOptions.hotUpdateChunkFilename;
						const hotUpdateMainFilename =
							mainTemplate.outputOptions.hotUpdateMainFilename;
						const hotUpdateFunction =
							mainTemplate.outputOptions.hotUpdateFunction;
						const globalObject = mainTemplate.outputOptions.globalObject;
						const currentHotUpdateChunkFilename = mainTemplate.getAssetPath(
							JSON.stringify(hotUpdateChunkFilename),
							{
								hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
								hashWithLength: length =>
									`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
								chunk: {
									id: '" + chunkId + "'
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

						return (
							source +
							"\n" +
							`var parentHotUpdateCallback = ${globalObject}[${JSON.stringify(
								hotUpdateFunction
							)}];\n` +
							`${globalObject}[${JSON.stringify(hotUpdateFunction)}] = ` +
							Template.getFunctionContent(
								require("./WebWorkerMainTemplate.runtime")
							)
								.replace(/\/\/\$semicolon/g, ";")
								.replace(/\$publicPath\$/g, RuntimeGlobals.publicPath)
								.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
								.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
								.replace(/\$hash\$/g, JSON.stringify(hash))
						);
					}
				);
				mainTemplate.hooks.hash.tap("WebWorkerMainTemplatePlugin", hash => {
					hash.update("webworker");
					hash.update("4");
				});
			}
		);
	}
}
module.exports = WebWorkerTemplatePlugin;
