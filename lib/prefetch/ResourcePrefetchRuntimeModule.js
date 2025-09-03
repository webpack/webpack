/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

class ResourcePrefetchRuntimeModule extends RuntimeModule {
	/**
	 * @param {string} type "prefetch" or "preload"
	 */
	constructor(type) {
		super(`asset ${type}`, RuntimeModule.STAGE_ATTACH);
		this._type = type;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { compilation } = this;
		if (!compilation) return null;

		const { runtimeTemplate, outputOptions } = compilation;
		const fnName =
			this._type === "prefetch"
				? RuntimeGlobals.prefetchAsset
				: RuntimeGlobals.preloadAsset;

		const crossOriginLoading = outputOptions.crossOriginLoading;

		return Template.asString([
			`${fnName} = ${runtimeTemplate.basicFunction(
				"moduleId, as, fetchPriority, relative",
				[
					"var url;",
					"if (relative) {",
					Template.indent([
						`url = new ${RuntimeGlobals.relativeUrl}(${RuntimeGlobals.require}(moduleId));`
					]),
					"} else {",
					Template.indent([
						`url = new URL(${RuntimeGlobals.require}(moduleId), ${RuntimeGlobals.baseURI});`
					]),
					"}",
					"",
					"var link = document.createElement('link');",
					`link.rel = '${this._type}';`,
					"if (as) link.as = as;",
					"link.href = url.href;",
					"",
					"if (fetchPriority) {",
					Template.indent([
						"link.fetchPriority = fetchPriority;",
						"link.setAttribute('fetchpriority', fetchPriority);"
					]),
					"}",
					"",
					crossOriginLoading
						? Template.asString([
								"if (link.href.indexOf(window.location.origin + '/') !== 0) {",
								Template.indent([
									`link.crossOrigin = ${JSON.stringify(crossOriginLoading)};`
								]),
								"}"
							])
						: "",
					"",
					"document.head.appendChild(link);"
				]
			)};`
		]);
	}
}

module.exports = ResourcePrefetchRuntimeModule;
