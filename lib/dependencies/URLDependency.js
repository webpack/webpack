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
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").GetConditionFn} GetConditionFn */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../optimize/InnerGraph").UsedByExports} UsedByExports */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

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
		/** @type {UsedByExports | undefined} */
		this.usedByExports = undefined;
		this.prefetch = undefined;
		this.preload = undefined;
		this.fetchPriority = undefined;
		/** @type {string|undefined} */
		this.preloadAs = undefined;
		/** @type {string|undefined} */
		this.preloadType = undefined;
		/** @type {string|undefined} */
		this.preloadMedia = undefined;
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
		write(this.preloadMedia);
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
		this.preloadMedia = read();
		super.deserialize(context);
	}
}

URLDependency.Template = class URLDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Determines the 'as' attribute value for prefetch/preload based on file extension
	 * https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload#what_types_of_content_can_be_preloaded
	 * @param {string} request module request string or filename
	 * @returns {string} asset type for link element 'as' attribute
	 */
	static _getAssetType(request) {
		if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|tiff?)$/i.test(request)) {
			return "image";
		} else if (/\.(woff2?|ttf|otf|eot)$/i.test(request)) {
			return "font";
		} else if (/\.(js|mjs|jsx|ts|tsx)$/i.test(request)) {
			return "script";
		} else if (/\.css$/i.test(request)) {
			return "style";
		} else if (/\.vtt$/i.test(request)) {
			return "track";
		} else if (
			/\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|avi|mov|wmv|mkv)$/i.test(request)
		) {
			// Audio/video files use 'fetch' as browser support varies
			return "fetch";
		}
		return "fetch";
	}

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
			const detectedAssetType = URLDependencyTemplate._getAssetType(request);
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
					const asArg = JSON.stringify(dep.preloadAs || detectedAssetType);
					const fetchPriorityArg = dep.fetchPriority
						? JSON.stringify(dep.fetchPriority)
						: "undefined";
					const typeArg = dep.preloadType
						? JSON.stringify(dep.preloadType)
						: "undefined";
					const mediaArg = dep.preloadMedia
						? JSON.stringify(dep.preloadMedia)
						: "undefined";
					initFragments.push(
						new InitFragment(
							`${RuntimeGlobals.preloadAsset}(${moduleId}, ${asArg}, ${fetchPriorityArg}, ${typeArg}, ${mediaArg}, ${dep.relative});\n`,
							InitFragment.STAGE_CONSTANTS,
							-10,
							`asset_preload_${moduleId}`
						)
					);
				} else if (dep.prefetch) {
					runtimeRequirements.add(RuntimeGlobals.prefetchAsset);
					const asArg = JSON.stringify(detectedAssetType);
					const fetchPriorityArg = dep.fetchPriority
						? JSON.stringify(dep.fetchPriority)
						: "undefined";
					initFragments.push(
						new InitFragment(
							`${RuntimeGlobals.prefetchAsset}(${moduleId}, ${asArg}, ${fetchPriorityArg}, undefined, undefined, ${dep.relative});\n`,
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
