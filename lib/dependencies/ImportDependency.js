/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const { ImportPhaseUtils } = require("./ImportPhase");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../AsyncDependenciesBlock")} AsyncDependenciesBlock */
/** @typedef {import("../Dependency").GetConditionFn} GetConditionFn */
/** @typedef {import("../Dependency").RawReferencedExports} RawReferencedExports */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../Module").BuildMeta} BuildMeta */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").ImportAttributes} ImportAttributes */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("./HarmonyImportGuard").DependencyGuard} DependencyGuard */
/** @typedef {import("./ImportPhase").ImportPhaseType} ImportPhaseType */

const getHarmonyImportGuard = memoize(() => require("./HarmonyImportGuard"));

class ImportDependency extends ModuleDependency {
	/**
	 * Creates an instance of ImportDependency.
	 * @param {string} request the request
	 * @param {Range} range expression range
	 * @param {RawReferencedExports | null} referencedExports list of referenced exports
	 * @param {ImportPhaseType} phase import phase
	 * @param {ImportAttributes=} attributes import attributes
	 */
	constructor(request, range, referencedExports, phase, attributes) {
		super(request);
		this.range = range;
		/** @type {RawReferencedExports | null} */
		this.referencedExports = referencedExports;
		/** @type {ImportPhaseType} */
		this.phase = phase;
		/** @type {ImportAttributes | undefined} */
		this.attributes = attributes;
		/** @type {DependencyGuard[] | undefined} */
		this.branchGuards = undefined;
		// Range of the `import(specifier, options)` second argument, set only when
		// it is not a statically extractable attributes object and must therefore
		// be evaluated and validated at runtime.
		/** @type {Range | undefined} */
		this.optionsRange = undefined;
	}

	get type() {
		return "import()";
	}

	get category() {
		return "esm";
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		const guards = this.branchGuards;
		if (guards === undefined) return null;
		return (connection, runtime) =>
			!getHarmonyImportGuard().isDeadByGuards(guards, moduleGraph, runtime);
	}

	/**
	 * Returns an identifier to merge equal requests.
	 * @returns {string | null} an identifier to merge equal requests
	 */
	getResourceIdentifier() {
		let str = super.getResourceIdentifier();
		// We specifically use this check to avoid writing the default (`evaluation` or `0`) value and save memory
		if (this.phase) {
			str += `|phase${ImportPhaseUtils.stringify(this.phase)}`;
		}
		if (this.attributes) {
			str += `|attributes${JSON.stringify(this.attributes)}`;
		}
		return str;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		if (!this.referencedExports) return Dependency.EXPORTS_OBJECT_REFERENCED;
		/** @type {ReferencedExports} */
		const refs = [];
		for (const referencedExport of this.referencedExports) {
			if (referencedExport[0] === "default") {
				const selfModule =
					/** @type {Module} */
					(moduleGraph.getParentModule(this));
				const importedModule =
					/** @type {Module} */
					(moduleGraph.getModule(this));
				const exportsType = importedModule.getExportsType(
					moduleGraph,
					/** @type {BuildMeta} */
					(selfModule.buildMeta).strictHarmonyModule
				);
				if (
					exportsType === "default-only" ||
					exportsType === "default-with-named"
				) {
					return Dependency.EXPORTS_OBJECT_REFERENCED;
				}
			}
			refs.push({
				name: referencedExport,
				canMangle: false,
				canInline: false
			});
		}
		return refs;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.range);
		context.write(this.referencedExports);
		context.write(this.phase);
		context.write(this.attributes);
		context.write(this.branchGuards);
		context.write(this.optionsRange);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		this.referencedExports = context.read();
		this.phase = context.read();
		this.attributes = context.read();
		this.branchGuards = context.read();
		this.optionsRange = context.read();
		super.deserialize(context);
	}
}

makeSerializable(ImportDependency, "webpack/lib/dependencies/ImportDependency");

ImportDependency.Template = class ImportDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			runtimeTemplate,
			module,
			moduleGraph,
			chunkGraph,
			runtimeRequirements,
			runtime
		}
	) {
		const dep = /** @type {ImportDependency} */ (dependency);
		const connection = moduleGraph.getConnection(dep);
		// Dead branch: module is excluded and has no id; code is never executed.
		if (connection && !connection.isTargetActive(runtime)) {
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				"Promise.resolve(/* dead branch */)"
			);
			return;
		}
		const block = /** @type {AsyncDependenciesBlock} */ (
			moduleGraph.getParentBlock(dep)
		);
		let content = runtimeTemplate.moduleNamespacePromise({
			chunkGraph,
			block,
			module: /** @type {Module} */ (moduleGraph.getModule(dep)),
			request: dep.request,
			strict: /** @type {BuildMeta} */ (module.buildMeta).strictHarmonyModule,
			dependency: dep,
			message: "import()",
			runtimeRequirements,
			originModule: module
		});

		// For source phase imports, unwrap the default export
		// import.source() should return the source directly, not a namespace
		if (ImportPhaseUtils.isSource(dep.phase)) {
			content = `${content}.then(${runtimeTemplate.returningFunction(
				'm["default"]',
				"m"
			)})`;
		}

		// A non-static second argument must still be evaluated (for its side
		// effects and evaluation order) and validated per spec. Keep it in place
		// and wrap it in an inline validator that mirrors the runtime checks of
		// the spec's `import(specifier, options)` evaluation.
		if (dep.optionsRange) {
			const validator = runtimeTemplate.basicFunction("o", [
				"try {",
				Template.indent([
					"if (o !== undefined) {",
					Template.indent([
						'if ((typeof o !== "object" && typeof o !== "function") || o === null) throw new TypeError("The second argument to import() must be an object");',
						'var a = o["with"];',
						"if (a !== undefined) {",
						Template.indent([
							'if ((typeof a !== "object" && typeof a !== "function") || a === null) throw new TypeError("The \'with\' option must be an object");',
							"for (var k = Object.keys(a), i = 0; i < k.length; i++) {",
							Template.indent([
								'if (typeof a[k[i]] !== "string") throw new TypeError("Import attribute values must be strings");'
							]),
							"}"
						]),
						"}"
					]),
					"}"
				]),
				"} catch (e) { return Promise.reject(e); }",
				`return ${content};`
			]);
			source.replace(dep.range[0], dep.optionsRange[0] - 1, `(${validator})(`);
			source.replace(dep.optionsRange[1], dep.range[1] - 1, ")");
			return;
		}

		source.replace(dep.range[0], dep.range[1] - 1, content);
	}
};

module.exports = ImportDependency;
