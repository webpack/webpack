/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Compilation")} Compilation */

class AssetPrefetchPreloadRuntimeModule extends RuntimeModule {
	/**
	 * @param {string} type "prefetch" or "preload"
	 */
	constructor(type) {
		super(`asset ${type}`);
		this._type = type;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const { compilation } = this;
		const { runtimeTemplate } = compilation;
		const fn =
			this._type === "prefetch"
				? RuntimeGlobals.prefetchAsset
				: RuntimeGlobals.preloadAsset;

		return Template.asString([
			`${fn} = ${runtimeTemplate.basicFunction("url, as, fetchPriority", [
				"var link = document.createElement('link');",
				this._type === "prefetch"
					? "link.rel = 'prefetch';"
					: "link.rel = 'preload';",
				"if(as) link.as = as;",
				"link.href = url;",
				"if(fetchPriority) {",
				Template.indent([
					"link.fetchPriority = fetchPriority;",
					"link.setAttribute('fetchpriority', fetchPriority);"
				]),
				"}",
				// Add nonce if needed
				compilation.outputOptions.crossOriginLoading
					? Template.asString([
							"if(__webpack_require__.nc) {",
							Template.indent(
								"link.setAttribute('nonce', __webpack_require__.nc);"
							),
							"}"
						])
					: "",
				"document.head.appendChild(link);"
			])};`
		]);
	}
}

module.exports = AssetPrefetchPreloadRuntimeModule;
