/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const NormalModule = require("../NormalModule");
const makeSerializable = require("../util/makeSerializable");

/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../NormalModule").NormalModuleBuildInfo} NormalModuleBuildInfo */
/** @typedef {import("../NormalModule").NormalModuleCreateData} NormalModuleCreateData */

/**
 * Defines the build info properties specific to javascript modules.
 * @typedef {object} KnownJavascriptModuleBuildInfo
 * @property {string=} moduleConcatenationBailout using in CommonJs
 * @property {boolean=} needCreateRequire using in APIPlugin
 * @property {Set<string>=} pureFunctions names of locally declared functions known to be free of side effects
 * @property {boolean=} inlineExports whether this module was parsed with `optimization.inlineExports` enabled (gates inlining of its exports)
 */

/** @typedef {NormalModuleBuildInfo & KnownJavascriptModuleBuildInfo} JavascriptModuleBuildInfo */

/**
 * Defines the build meta properties specific to javascript modules.
 * @typedef {object} KnownJavascriptModuleBuildMeta
 * @property {boolean=} strictHarmonyModule
 * @property {boolean=} treatAsCommonJs
 */

/** @typedef {BuildMeta & KnownJavascriptModuleBuildMeta} JavascriptModuleBuildMeta */

/**
 * Module class for all `javascript/*` modules. JavaScript-specific properties should live here instead of `NormalModule`.
 */
class JavascriptModule extends NormalModule {
	/**
	 * @param {NormalModuleCreateData} options options object
	 */
	constructor(options) {
		super(options);

		// Redeclared with the javascript specific shape
		/** @type {JavascriptModuleBuildInfo | undefined} */
		this.buildInfo = undefined;
		/** @type {JavascriptModuleBuildMeta | undefined} */
		this.buildMeta = undefined;
	}
}

makeSerializable(JavascriptModule, "webpack/lib/javascript/JavascriptModule");

module.exports = JavascriptModule;
