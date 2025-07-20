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

		// Check if we need to add prefetch/preload runtime
		const needsPrefetch = dep.prefetch !== undefined && dep.prefetch !== false;
		const needsPreload = dep.preload !== undefined && dep.preload !== false;

		if (needsPrefetch || needsPreload) {
			// Get the module to determine asset type
			const module = moduleGraph.getModule(dep);
			let asType = "";

			if (module) {
				const request = module.request || "";
				// Determine the 'as' attribute based on file extension
				// Reference: MDN rel=preload documentation (https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload)
				// Valid 'as' values: fetch, font, image, script, style, track
				// Note: audio/video are in spec but not supported by major browsers as of 2025
				if (/\.(png|jpe?g|gif|svg|webp|avif|bmp|ico|tiff?)$/i.test(request)) {
					asType = "image";
				} else if (/\.(woff2?|ttf|otf|eot)$/i.test(request)) {
					asType = "font";
				} else if (/\.(js|mjs|jsx|ts|tsx)$/i.test(request)) {
					asType = "script";
				} else if (/\.css$/i.test(request)) {
					asType = "style";
				} else if (/\.vtt$/i.test(request)) {
					asType = "track"; // WebVTT files for video subtitles/captions
				} else if (
					/\.(mp4|webm|ogg|mp3|wav|flac|aac|m4a|avi|mov|wmv|mkv)$/i.test(
						request
					)
				) {
					// Audio/video files: use 'fetch' as fallback since as='audio'/'video' not supported
					// Reference: https://github.com/mdn/browser-compat-data/issues/9577
					asType = "fetch";
				} else if (/\.(json|xml|txt|csv|pdf|doc|docx|wasm)$/i.test(request)) {
					asType = "fetch"; // Data files, documents, WebAssembly
				} else {
					asType = "fetch"; // Generic fetch for unknown types
				}
			}

			// Generate the module expression (just the module id)
			const moduleExpr = runtimeTemplate.moduleRaw({
				chunkGraph,
				module: moduleGraph.getModule(dep),
				request: dep.request,
				runtimeRequirements,
				weak: false
			});

			// Build the prefetch/preload code
			const hintCode = [];
			const fetchPriority = dep.fetchPriority
				? `"${dep.fetchPriority}"`
				: "undefined";

			if (needsPrefetch && !needsPreload) {
				// Only prefetch
				runtimeRequirements.add(RuntimeGlobals.prefetchAsset);
				hintCode.push(
					`${RuntimeGlobals.prefetchAsset}(url, "${asType}", ${fetchPriority});`
				);
			} else if (needsPreload) {
				// Preload (takes precedence over prefetch)
				runtimeRequirements.add(RuntimeGlobals.preloadAsset);
				hintCode.push(
					`${RuntimeGlobals.preloadAsset}(url, "${asType}", ${fetchPriority});`
				);
			}

			// Wrap in IIFE to execute hint code and return URL
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
		} else if (dep.relative) {
			// No prefetch/preload - use original code
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
