/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { SyncWaterfallHook } = require("tapable");
const Compilation = require("../Compilation");
const RuntimeGlobals = require("../RuntimeGlobals");
const RuntimeModule = require("../RuntimeModule");
const Template = require("../Template");

/** @typedef {import("../Module").ReadOnlyRuntimeRequirements} ReadOnlyRuntimeRequirements */
/** @typedef {import("../RuntimeTemplate")} RuntimeTemplate */

/**
 * @typedef {object} URLPreloadRuntimeModulePluginHooks
 * @property {SyncWaterfallHook<[string]>} linkPreload
 */

/** @type {WeakMap<Compilation, URLPreloadRuntimeModulePluginHooks>} */
const compilationHooksMap = new WeakMap();

class URLPreloadRuntimeModule extends RuntimeModule {
	/**
	 * @param {Compilation} compilation the compilation
	 * @returns {URLPreloadRuntimeModulePluginHooks} hooks
	 */
	static getCompilationHooks(compilation) {
		if (!(compilation instanceof Compilation)) {
			throw new TypeError(
				"The 'compilation' argument must be an instance of Compilation"
			);
		}
		let hooks = compilationHooksMap.get(compilation);
		if (hooks === undefined) {
			hooks = {
				linkPreload: new SyncWaterfallHook(["source"])
			};
			compilationHooksMap.set(compilation, hooks);
		}
		return hooks;
	}

	/**
	 * @param {ReadOnlyRuntimeRequirements} runtimeRequirements runtime requirements
	 */
	constructor(runtimeRequirements) {
		super("asset preloading", RuntimeModule.STAGE_ATTACH);

		this.runtimeRequirements = runtimeRequirements;
	}

	/**
	 * @returns {string | null} runtime code
	 */
	generate() {
		const compilation = /** @type {Compilation} */ (this.compilation);
		const {
			runtimeTemplate,
			outputOptions: { crossOriginLoading }
		} = compilation;
		const { linkPreload } =
			URLPreloadRuntimeModule.getCompilationHooks(compilation);
		const hasBaseURI = this.runtimeRequirements.has(RuntimeGlobals.baseURI);
		const hasRelativeUrl = this.runtimeRequirements.has(
			RuntimeGlobals.relativeUrl
		);

		let urlConstructor;

		// TODO improve me
		if (hasBaseURI && !hasRelativeUrl) {
			urlConstructor = "URL";
		} else if (!hasBaseURI && hasRelativeUrl) {
			urlConstructor = RuntimeGlobals.relativeUrl;
		} else {
			urlConstructor = `(relative ? ${RuntimeGlobals.relativeUrl} : URL)`;
		}

		return Template.asString([
			`${RuntimeGlobals.preloadUrl} = ${runtimeTemplate.basicFunction(
				`moduleId, as, fetchPriority${hasRelativeUrl ? ", relative" : ""}`,
				[
					`if((!${RuntimeGlobals.hasOwnProperty}(__webpack_module_cache__, moduleId))) {`,
					Template.indent([
						linkPreload.call(
							Template.asString([
								"var link = document.createElement('link');",
								`if (${RuntimeGlobals.scriptNonce}) {`,
								Template.indent(
									`link.setAttribute("nonce", ${RuntimeGlobals.scriptNonce});`
								),
								"}",
								"if(fetchPriority) {",
								Template.indent(
									'link.setAttribute("fetchpriority", fetchPriority);'
								),
								"}",
								'link.rel = "preload";',
								"link.as = as;",
								`link.href = new ${urlConstructor}(${RuntimeGlobals.require}(moduleId), ${RuntimeGlobals.baseURI});`,
								crossOriginLoading
									? crossOriginLoading === "use-credentials"
										? 'link.crossOrigin = "use-credentials";'
										: Template.asString([
												"if (link.href.indexOf(window.location.origin + '/') !== 0) {",
												Template.indent(
													`link.crossOrigin = ${JSON.stringify(
														crossOriginLoading
													)};`
												),
												"}"
											])
									: ""
							])
						),
						"document.head.appendChild(link);"
					]),
					"}"
				]
			)};`
		]);
	}
}

module.exports = URLPreloadRuntimeModule;
