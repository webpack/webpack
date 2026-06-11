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
 * @typedef {object} KnownJavascriptBuildInfo
 * @property {string=} moduleConcatenationBailout using in CommonJs
 * @property {boolean=} needCreateRequire using in APIPlugin
 * @property {Set<string>=} pureFunctions names of locally declared functions known to be free of side effects
 * @property {boolean=} inlineExports whether this module was parsed with `optimization.inlineExports` enabled (gates inlining of its exports)
 */

/** @typedef {NormalModuleBuildInfo & KnownJavascriptBuildInfo} JavascriptBuildInfo */

/**
 * Defines the build meta properties specific to javascript modules.
 * @typedef {object} KnownJavascriptBuildMeta
 * @property {boolean=} strictHarmonyModule
 * @property {boolean=} treatAsCommonJs
 */

/** @typedef {BuildMeta & KnownJavascriptBuildMeta} JavascriptBuildMeta */

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
		/** @type {JavascriptBuildInfo | undefined} */
		this.buildInfo = undefined;
		/** @type {JavascriptBuildMeta | undefined} */
		this.buildMeta = undefined;
	}
}

makeSerializable(JavascriptModule, "webpack/lib/javascript/JavascriptModule");

module.exports = JavascriptModule;
