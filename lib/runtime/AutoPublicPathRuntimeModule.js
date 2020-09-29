/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");
const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");
const { getUndoPath } = require("../util/identifier");

class AutoPublicPathRuntimeModule extends RuntimeModule {
	constructor() {
		super("publicPath", 5);
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { scriptType, importMetaName } = compilation.outputOptions;
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
		const undoPath = getUndoPath(chunkName, false);
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
			"// When supporting browsers where an automatic publicPath is not supported you must specify an output.publicPath manually via configuration",
			'// or pass an empty string ("") and set the __webpack_public_path__ variable from your code to use your own logic.',
			'if (!scriptUrl) throw new Error("Automatic publicPath is not supported in this browser");',
			'scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\\?.*$/, "").replace(/\\/[^\\/]+$/, "/");',
			!undoPath
				? `${RuntimeGlobals.publicPath} = scriptUrl;`
				: `${RuntimeGlobals.publicPath} = scriptUrl + ${JSON.stringify(
						undoPath
				  )};`
		]);
	}
}

module.exports = AutoPublicPathRuntimeModule;
