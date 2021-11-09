/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const { getUndoPath } = require("../util/identifier");

class DetectScriptUrlRuntimeModule extends RuntimeModule {
	constructor() {
		super("scriptUrl", RuntimeModule.STAGE_NORMAL);
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { scriptType, importMetaName, path } = compilation.outputOptions;
		const chunkName = compilation.getPath(
			JavascriptModulesPlugin.getChunkFilenameTemplate(
				this.chunk,
				compilation.outputOptions
			),
			{
				chunk: this.chunk,
				contentHashType: "javascript"
			}
		);
		const undoPath = getUndoPath(chunkName, path, false);

		return Template.asString([
			"var scriptUrl;",
			scriptType === "module"
				? `if (typeof ${importMetaName}.url === "string") scriptUrl = ${importMetaName}.url`
				: Template.asString([
						`if (${RuntimeGlobals.global}.importScripts) scriptUrl = ${RuntimeGlobals.global}.location + "";`,
						`var document = ${RuntimeGlobals.global}.document;`,
						"if (!scriptUrl && document) {",
						Template.indent([
							`if (document.currentScript)`,
							Template.indent(`scriptUrl = document.currentScript.src`),
							"if (!scriptUrl) {",
							Template.indent([
								'var scripts = document.getElementsByTagName("script");',
								"if(scripts.length) scriptUrl = scripts[scripts.length - 1].src"
							]),
							"}"
						]),
						"}"
				  ]),
			'if (scriptUrl) scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\\?.*$/, "").replace(/\\/[^\\/]+$/, "/");',
			!undoPath
				? `${RuntimeGlobals.scriptUrl} = scriptUrl;`
				: `${RuntimeGlobals.scriptUrl} = scriptUrl + ${JSON.stringify(
						undoPath
				  )};`
		]);
	}
}

module.exports = DetectScriptUrlRuntimeModule;
