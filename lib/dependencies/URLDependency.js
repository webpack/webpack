/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const { JAVASCRIPT_TYPE } = require("../ModuleSourceTypeConstants");
const RuntimeGlobals = require("../RuntimeGlobals");
const RawDataUrlModule = require("../asset/RawDataUrlModule");
const {
	getDependencyUsedByExportsCondition
} = require("../optimize/InnerGraph");
const { getUndoPath } = require("../util/identifier");
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
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

const getIgnoredRawDataUrlModule = memoize(
	() => new RawDataUrlModule("data:,", "ignored-asset", "(ignored asset)")
);

/**
 * Computes the `../`-path from the consuming module's chunk(s) back to the output
 * root, so an asset can be referenced relative to `import.meta.url`. Returns `null`
 * when the module lives in chunks of different depths (no single relative path works).
 * @param {Module} module the consuming module
 * @param {ChunkGraph} chunkGraph the chunk graph
 * @param {Compilation} compilation the compilation
 * @returns {string | null} relative undo path, or `null` when ambiguous
 */
const getModuleUndoPath = (module, chunkGraph, compilation) => {
	const JavascriptModulesPlugin = require("../javascript/JavascriptModulesPlugin");

	const { outputOptions } = compilation;
	const outputPath = /** @type {string} */ (outputOptions.path);
	/** @type {string | null} */
	let result = null;
	let found = false;
	for (const chunk of chunkGraph.getModuleChunksIterable(module)) {
		const chunkName = compilation.getPath(
			JavascriptModulesPlugin.getChunkFilenameTemplate(chunk, outputOptions),
			{ chunk, contentHashType: JAVASCRIPT_TYPE }
		);
		const undo = getUndoPath(chunkName, outputPath, true);
		if (!found) {
			result = undo;
			found = true;
		} else if (result !== undo) {
			return null;
		}
	}
	return found ? result : null;
};

/**
 * Resolves the static literal specifier (already quoted) for `new URL(<here>, import.meta.url)`,
 * or `null` when the asset url can't be determined statically (e.g. a runtime/dynamic publicPath).
 * @param {URLDependency} dep the dependency
 * @param {DependencyTemplateContext} templateContext the template context
 * @returns {string | null} a JS string literal, or `null` to fall back to the runtime form
 */
const getAnalyzableUrlSpecifier = (dep, templateContext) => {
	const {
		moduleGraph,
		chunkGraph,
		runtime,
		codeGenerationResults,
		runtimeTemplate
	} = templateContext;
	const module = moduleGraph.getModule(dep);
	if (!module || !codeGenerationResults.has(module, runtime)) return null;
	const urlData = codeGenerationResults.getData(module, runtime, "url");
	const jsUrl = urlData && urlData[JAVASCRIPT_TYPE];
	// A generator `publicPath` or a data: url already bakes a literal here — use it as-is.
	if (typeof jsUrl === "string" && !jsUrl.includes(RuntimeGlobals.require)) {
		return jsUrl;
	}
	const filename = codeGenerationResults.getData(module, runtime, "filename");
	if (typeof filename !== "string") return null;
	const compilation = runtimeTemplate.compilation;
	const { publicPath } = runtimeTemplate.outputOptions;
	if (publicPath === "auto") {
		const undo = getModuleUndoPath(module, chunkGraph, compilation);
		return undo === null ? null : JSON.stringify(undo + filename);
	}
	// A static publicPath without `[…]` template tokens is known at build time.
	if (typeof publicPath === "string" && !publicPath.includes("[")) {
		return JSON.stringify(publicPath + filename);
	}
	return null;
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
		this.relative = relative || false;
		/** @type {UsedByExports | undefined} */
		this.usedByExports = undefined;
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
		const { write } = context;
		write(this.outerRange);
		write(this.relative);
		write(this.usedByExports);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
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
		// can statically follow the asset. `url: "relative"` keeps its runtime polyfill.
		if (!dep.relative && runtimeTemplate.supportsAnalyzableEsmUrl()) {
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
	}
};

makeSerializable(URLDependency, "webpack/lib/dependencies/URLDependency");

module.exports = URLDependency;
