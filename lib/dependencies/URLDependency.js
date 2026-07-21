/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const {
	ASSET_URL_TYPE,
	JAVASCRIPT_TYPE
} = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const RawDataUrlModule = require("../asset/RawDataUrlModule");
const {
	getDependencyUsedByExportsCondition
} = require("../optimize/InnerGraph");
const { toJsStringLiteral } = require("../util/identifier");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../ChunkGraph")} ChunkGraph */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").GetConditionFn} GetConditionFn */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../optimize/InnerGraph").UsedByExports} UsedByExports */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range, boolean, UsedByExports | undefined, true | undefined, true | undefined, ("high" | "low" | "auto" | undefined), string | undefined, string | undefined, string | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Range, boolean, UsedByExports | undefined, true | undefined, true | undefined, ("high" | "low" | "auto" | undefined), string | undefined, string | undefined, string | undefined]>} ObjectSerializerContext */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

/**
 * Resolves the static literal specifier (already quoted) for `new URL(<here>, import.meta.url)`,
 * or `null` when the asset url can't be determined statically (e.g. a runtime/dynamic publicPath).
 * @param {URLDependency} dep the dependency
 * @param {DependencyTemplateContext} templateContext the template context
 * @returns {string | null} a JS string literal, or `null` to fall back to the runtime form
 */
const getAnalyzableUrlSpecifier = (dep, templateContext) => {
	const {
		module: consumingModule,
		moduleGraph,
		chunkGraph,
		runtime,
		codeGenerationResults,
		runtimeTemplate
	} = templateContext;
	const assetModule = moduleGraph.getModule(dep);
	if (!assetModule || !codeGenerationResults.has(assetModule, runtime)) {
		return null;
	}
	const urlData = codeGenerationResults.getData(assetModule, runtime, "url");
	if (!urlData) return null;

	const jsUrl = urlData[JAVASCRIPT_TYPE];
	if (typeof jsUrl === "string") {
		// The asset concatenates the runtime publicPath; rebuild a literal from the
		// resolved filename. The base is the consuming chunk (`import.meta.url`).
		if (jsUrl.includes(RuntimeGlobals.require)) {
			const filename = codeGenerationResults.getData(
				assetModule,
				runtime,
				"filename"
			);
			if (typeof filename !== "string") return null;
			const { publicPath } = runtimeTemplate.outputOptions;
			if (publicPath === "auto") {
				const undo = runtimeTemplate._getModuleUndoPath(
					consumingModule,
					chunkGraph
				);
				return undo === null ? null : toJsStringLiteral(undo + filename);
			}
			if (typeof publicPath === "string" && !publicPath.includes("[")) {
				return toJsStringLiteral(publicPath + filename);
			}
			return null;
		}
		// An already-quoted literal (generator `publicPath` / data: url) is used as-is;
		// a raw value (external asset) is normalized to a quoted string.
		return jsUrl.startsWith('"') ? jsUrl : toJsStringLiteral(jsUrl);
	}

	// Wrapper dropped: the asset is consumed as `asset-url` (absolute publicPath),
	// so its resolved url is already a chunk-independent literal.
	const assetUrl = urlData[ASSET_URL_TYPE];
	return typeof assetUrl === "string" ? toJsStringLiteral(assetUrl) : null;
};

class URLDependency extends ModuleDependency {
	/**
	 * Creates an instance of URLDependency.
	 * @param {string} request request
	 * @param {Range} range range of the arguments of new URL( |> ... <| )
	 * @param {Range} outerRange range of the full |> new URL(...) <|
	 * @param {boolean=} relative use relative urls instead of absolute with base uri
	 */
	constructor(request, range, outerRange, relative) {
		super(request);
		this.range = range;
		this.outerRange = outerRange;
		/** @type {boolean} */
		this.relative = relative || false;
		/** @type {UsedByExports | undefined} */
		this.usedByExports = undefined;
		/** @type {true | undefined} */
		this.prefetch = undefined;
		/** @type {true | undefined} */
		this.preload = undefined;
		/** @type {"high" | "low" | "auto" | undefined} */
		this.fetchPriority = undefined;
		/** @type {string | undefined} */
		this.asAttribute = undefined;
		/** @type {string | undefined} */
		this.typeAttribute = undefined;
		/** @type {string | undefined} */
		this.mediaAttribute = undefined;
	}

	get type() {
		return "new URL()";
	}

	get category() {
		return "url";
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		return getDependencyUsedByExportsCondition(this, moduleGraph);
	}

	/**
	 * Creates an ignored module.
	 * @param {string} context context directory
	 * @returns {Module} ignored module
	 */
	createIgnoredModule(context) {
		return getIgnoredRawDataUrlModule();
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.outerRange)
			.write(this.relative)
			.write(this.usedByExports)
			.write(this.prefetch)
			.write(this.preload)
			.write(this.fetchPriority)
			.write(this.asAttribute)
			.write(this.typeAttribute)
			.write(this.mediaAttribute);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.outerRange = context.read();
		const c1 = context.rest;
		this.relative = c1.read();
		const c2 = c1.rest;
		this.usedByExports = c2.read();
		const c3 = c2.rest;
		this.prefetch = c3.read();
		const c4 = c3.rest;
		this.preload = c4.read();
		const c5 = c4.rest;
		this.fetchPriority = c5.read();
		const c6 = c5.rest;
		this.asAttribute = c6.read();
		const c7 = c6.rest;
		this.typeAttribute = c7.read();
		const c8 = c7.rest;
		this.mediaAttribute = c8.read();
		super.deserialize(c8.rest);
	}
}

URLDependency.Template = class URLDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
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

		// For ESM module output, emit the analyzable `new URL("./asset", import.meta.url)`
		// form (literal specifier, no runtime helpers) so other bundlers and webpack itself
		// can statically follow the asset. `url: "relative"` and prefetch/preload hints
		// (which need the runtime asset reference) keep the runtime form.
		if (
			!dep.relative &&
			!dep.prefetch &&
			!dep.preload &&
			runtimeTemplate.supportsAnalyzableEsm()
		) {
			const specifier = getAnalyzableUrlSpecifier(dep, templateContext);
			if (specifier !== null) {
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					`/* asset import */ ${specifier}, ${runtimeTemplate.outputOptions.importMetaName}.url`
				);
				return;
			}
		}

		runtimeRequirements.add(RuntimeGlobals.require);

		const module = moduleGraph.getModule(dep);
		const moduleRaw = runtimeTemplate.moduleRaw({
			chunkGraph,
			module,
			request: dep.request,
			runtimeRequirements,
			weak: false
		});

		// Resource hints fire eagerly at chunk startup via the marker
		// requirement / `StartupAssetHintRuntimeModule`; the call site stays
		// a plain URL expression, so the browser is already prefetching by
		// the time user code reaches this line.
		if (dep.prefetch || dep.preload) {
			runtimeRequirements.add(RuntimeGlobals.startupAssetHints);
			if (dep.prefetch) runtimeRequirements.add(RuntimeGlobals.prefetchAsset);
			if (dep.preload) runtimeRequirements.add(RuntimeGlobals.preloadAsset);
		}

		if (dep.relative) {
			runtimeRequirements.add(RuntimeGlobals.relativeUrl);
			source.replace(
				dep.outerRange[0],
				dep.outerRange[1] - 1,
				`/* asset import */ new ${RuntimeGlobals.relativeUrl}(${moduleRaw})`
			);
		} else {
			runtimeRequirements.add(RuntimeGlobals.baseURI);
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				`/* asset import */ ${moduleRaw}, ${RuntimeGlobals.baseURI}`
			);
		}
	}
};

makeSerializable(URLDependency, "webpack/lib/dependencies/URLDependency");

module.exports = URLDependency;
