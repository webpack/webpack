/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const InitFragment = require("../InitFragment");
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
		this.prefetch = undefined;
		this.preload = undefined;
		this.fetchPriority = undefined;
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
			runtime,
			initFragments
		} = templateContext;
		const dep = /** @type {URLDependency} */ (dependency);

		const module = moduleGraph.getModule(dep);
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

		// Standard URL generation
		if (dep.relative) {
			runtimeRequirements.add(RuntimeGlobals.relativeUrl);
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				`/* asset import */ new ${RuntimeGlobals.relativeUrl}(${runtimeTemplate.moduleRaw(
					{
						chunkGraph,
						module,
						request: dep.request,
						runtimeRequirements,
						weak: false
					}
				)})`
			);
		} else {
			runtimeRequirements.add(RuntimeGlobals.baseURI);
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				`/* asset import */ ${runtimeTemplate.moduleRaw({
					chunkGraph,
					module,
					request: dep.request,
					runtimeRequirements,
					weak: false
				})}, ${RuntimeGlobals.baseURI}`
			);
		}

		// Prefetch/Preload via InitFragment
		if ((dep.prefetch || dep.preload) && module) {
			const request = dep.request;
			const assetType = getAssetType(request);
			const id = chunkGraph.getModuleId(module);
			if (id !== null) {
				const moduleId = runtimeTemplate.moduleId({
					module,
					chunkGraph,
					request: dep.request,
					weak: false
				});

				if (dep.preload) {
					runtimeRequirements.add(RuntimeGlobals.preloadAsset);
					initFragments.push(
						new InitFragment(
							`${RuntimeGlobals.preloadAsset}(${moduleId}, ${JSON.stringify(
								assetType
							)}${dep.fetchPriority ? `, ${JSON.stringify(dep.fetchPriority)}` : ""}, ${
								dep.relative
							});\n`,
							InitFragment.STAGE_CONSTANTS,
							-10,
							`asset_preload_${moduleId}`
						)
					);
				} else if (dep.prefetch) {
					runtimeRequirements.add(RuntimeGlobals.prefetchAsset);
					initFragments.push(
						new InitFragment(
							`${RuntimeGlobals.prefetchAsset}(${moduleId}, ${JSON.stringify(
								assetType
							)}${dep.fetchPriority ? `, ${JSON.stringify(dep.fetchPriority)}` : ""}, ${
								dep.relative
							});\n`,
							InitFragment.STAGE_CONSTANTS,
							-5,
							`asset_prefetch_${moduleId}`
						)
					);
				}
			}
		}
	}
};

makeSerializable(URLDependency, "webpack/lib/dependencies/URLDependency");

module.exports = URLDependency;
