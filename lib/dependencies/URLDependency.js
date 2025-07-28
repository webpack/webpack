/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const RawDataUrlModule = require("../asset/RawDataUrlModule");
const {
	getDependencyUsedByExportsCondition
} = require("../optimize/InnerGraph");
const getAssetType = require("../util/assetType");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").GetConditionFn} GetConditionFn */
/** @typedef {import("../Dependency").UpdateHashContext} UpdateHashContext */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection")} ModuleGraphConnection */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/Hash")} Hash */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

class URLDependency extends ModuleDependency {
	/**
	 * @param {string} request request
	 * @param {Range} range range of the arguments of new URL( |> ... <| )
	 * @param {Range} outerRange range of the full |> new URL(...) <|
	 * @param {boolean=} relative use relative urls instead of absolute with base uri
	 */
	constructor(request, range, outerRange, relative) {
		super(request);
		this.range = range;
		this.outerRange = outerRange;
		this.relative = relative || false;
		/** @type {Set<string> | boolean | undefined} */
		this.usedByExports = undefined;
		/** @type {boolean | undefined} */
		this._startupPrefetch = undefined;
		/** @type {boolean | undefined} */
		this.prefetch = undefined;
		/** @type {boolean | undefined} */
		this.preload = undefined;
		/** @type {string | undefined} */
		this.fetchPriority = undefined;
		/** @type {string | undefined} */
		this.preloadAs = undefined;
		/** @type {string | undefined} */
		this.preloadType = undefined;
	}

	get type() {
		return "new URL()";
	}

	get category() {
		return "url";
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return getDependencyUsedByExportsCondition(
			this,
			this.usedByExports,
			moduleGraph
		);
	}

	/**
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		return getIgnoredRawDataUrlModule();
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.outerRange);
		write(this.relative);
		write(this.usedByExports);
		write(this.prefetch);
		write(this.preload);
		write(this.fetchPriority);
		write(this.preloadAs);
		write(this.preloadType);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.outerRange = read();
		this.relative = read();
		this.usedByExports = read();
		this.prefetch = read();
		this.preload = read();
		this.fetchPriority = read();
		this.preloadAs = read();
		this.preloadType = read();
		super.deserialize(context);
	}
}

URLDependency.Template = class URLDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const {
			chunkGraph,
			moduleGraph,
			runtimeRequirements,
			runtimeTemplate,
			runtime
		} = templateContext;
		const dep = /** @type {URLDependency} */ (dependency);
		const connection = moduleGraph.getConnection(dep);
		// Skip rendering depending when dependency is conditional
		if (connection && !connection.isTargetActive(runtime)) {
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				"/* unused asset import */ undefined"
			);
			return;
		}

		runtimeRequirements.add(RuntimeGlobals.require);

		// Determine if prefetch/preload hints are specified
		const needsPrefetch = dep.prefetch !== undefined && dep.prefetch !== false;
		const needsPreload = dep.preload !== undefined && dep.preload !== false;

		// Generate inline prefetch/preload code if not handled by startup module
		if ((needsPrefetch || needsPreload) && !dep._startupPrefetch) {
			// Resolve module to determine appropriate asset type
			const module = moduleGraph.getModule(dep);
			let asType = "";

			if (module) {
				const request = /** @type {string} */ (
					/** @type {{ request?: string }} */ (module).request || ""
				);
				asType = getAssetType(request);
			}

			// Get the module ID for runtime code generation
			const moduleExpr = runtimeTemplate.moduleRaw({
				chunkGraph,
				module: moduleGraph.getModule(dep),
				request: dep.request,
				runtimeRequirements,
				weak: false
			});

			// Construct prefetch/preload function calls
			const hintCode = [];
			// Validate fetchPriority against allowed values
			const validFetchPriority =
				dep.fetchPriority && ["high", "low", "auto"].includes(dep.fetchPriority)
					? dep.fetchPriority
					: undefined;
			const fetchPriority = validFetchPriority
				? `"${validFetchPriority}"`
				: "undefined";
			const preloadType = dep.preloadType
				? `"${dep.preloadType}"`
				: "undefined";

			if (needsPrefetch && !needsPreload) {
				// Generate prefetch call
				runtimeRequirements.add(RuntimeGlobals.prefetchAsset);
				hintCode.push(
					`${RuntimeGlobals.prefetchAsset}(url, "${asType}", ${fetchPriority}, ${preloadType});`
				);
			} else if (needsPreload) {
				// Generate preload call (overrides prefetch if both specified)
				runtimeRequirements.add(RuntimeGlobals.preloadAsset);
				hintCode.push(
					`${RuntimeGlobals.preloadAsset}(url, "${asType}", ${fetchPriority}, ${preloadType});`
				);
			}

			// Create IIFE that generates URL and adds resource hints
			if (dep.relative) {
				runtimeRequirements.add(RuntimeGlobals.relativeUrl);
				source.replace(
					dep.outerRange[0],
					dep.outerRange[1] - 1,
					`/* asset import */ (function() {
						var url = new ${RuntimeGlobals.relativeUrl}(${moduleExpr});
						${hintCode.join("\n")}
						return url;
					})()`
				);
			} else {
				runtimeRequirements.add(RuntimeGlobals.baseURI);
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					`/* asset import */ (function() {
						var url = new URL(${moduleExpr}, ${RuntimeGlobals.baseURI});
						${hintCode.join("\n")}
						return url;
					})(), ${RuntimeGlobals.baseURI}`
				);
			}
		} else if ((needsPrefetch || needsPreload) && dep._startupPrefetch) {
			// Generate standard URL when prefetch/preload is handled by startup module
			if (dep.relative) {
				runtimeRequirements.add(RuntimeGlobals.relativeUrl);
				source.replace(
					dep.outerRange[0],
					dep.outerRange[1] - 1,
					`/* asset import */ new ${
						RuntimeGlobals.relativeUrl
					}(${runtimeTemplate.moduleRaw({
						chunkGraph,
						module: moduleGraph.getModule(dep),
						request: dep.request,
						runtimeRequirements,
						weak: false
					})})`
				);
			} else {
				runtimeRequirements.add(RuntimeGlobals.baseURI);
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					`/* asset import */ ${runtimeTemplate.moduleRaw({
						chunkGraph,
						module: moduleGraph.getModule(dep),
						request: dep.request,
						runtimeRequirements,
						weak: false
					})}, ${RuntimeGlobals.baseURI}`
				);
			}
			// Register runtime requirements for prefetch/preload functions
			if (needsPrefetch && !needsPreload) {
				runtimeRequirements.add(RuntimeGlobals.prefetchAsset);
			} else if (needsPreload) {
				runtimeRequirements.add(RuntimeGlobals.preloadAsset);
			}
		} else if (dep.relative) {
			// Standard URL generation without resource hints
			runtimeRequirements.add(RuntimeGlobals.relativeUrl);
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				`/* asset import */ new ${
					RuntimeGlobals.relativeUrl
				}(${runtimeTemplate.moduleRaw({
					chunkGraph,
					module: moduleGraph.getModule(dep),
					request: dep.request,
					runtimeRequirements,
					weak: false
				})})`
			);
		} else {
			runtimeRequirements.add(RuntimeGlobals.baseURI);

			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				`/* asset import */ ${runtimeTemplate.moduleRaw({
					chunkGraph,
					module: moduleGraph.getModule(dep),
					request: dep.request,
					runtimeRequirements,
					weak: false
				})}, ${RuntimeGlobals.baseURI}`
			);
		}
	}
};

makeSerializable(URLDependency, "webpack/lib/dependencies/URLDependency");

module.exports = URLDependency;
