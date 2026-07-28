/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Dependency = require("../Dependency");
const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const {
	ESM_MODULE_EXPORTS_NAME,
	getRequireEsmModuleExportsAccess,
	isRequireEsmModuleExportsModule
} = require("./CommonJsDependencyHelpers");
const ModuleDependency = require("./ModuleDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency").GetConditionFn} GetConditionFn */
/** @typedef {import("../Dependency").RawReferencedExports} RawReferencedExports */
/** @typedef {import("../Dependency").ReferencedExports} ReferencedExports */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("./HarmonyImportGuard").DependencyGuard} DependencyGuard */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[RawReferencedExports | null, Range | undefined, DependencyGuard[] | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[RawReferencedExports | null, Range | undefined, DependencyGuard[] | undefined]>} ObjectSerializerContext */

const getHarmonyImportGuard = memoize(() => require("./HarmonyImportGuard"));

/**
 * Trims a member-access path at the first segment that is definitively not a
 * provided export of the module. Such a segment is a runtime property (e.g. an
 * array/object prototype method like `arr.includes`), so only the value up to
 * that point is observed; referencing the whole value keeps its data intact
 * instead of tree-shaking it away. Real named exports (`utils.foo`) are kept.
 * @param {import("../ExportsInfo")} exportsInfo module exports info
 * @param {string[]} name member-access path
 * @returns {string[]} the provided prefix of the path
 */
const trimToProvidedPrefix = (exportsInfo, name) => {
	let current = exportsInfo;
	for (let i = 0; i < name.length; i++) {
		const exportInfo = current.getReadOnlyExportInfo(name[i]);
		if (exportInfo.provided === false) return name.slice(0, i);
		const nested = exportInfo.exportsInfo;
		if (!nested) return name;
		current = nested;
	}
	return name;
};

class CommonJsRequireDependency extends ModuleDependency {
	/**
	 * Creates an instance of CommonJsRequireDependency.
	 * @param {string} request request
	 * @param {Range=} range location in source code of the string-literal argument (gets replaced by the module id)
	 * @param {string=} context request context
	 * @param {RawReferencedExports | null=} referencedExports list of referenced exports
	 * @param {Range=} valueRange location in source code of the whole `require(...)` call (for `require(esm)` interop)
	 */
	constructor(
		request,
		range,
		context,
		referencedExports = null,
		valueRange = undefined
	) {
		super(request);
		this.range = range;
		/** @type {string | undefined} */
		this._context = context;
		/** @type {RawReferencedExports | null} */
		this.referencedExports = referencedExports;
		this.valueRange = valueRange;
		/** @type {DependencyGuard[] | undefined} */
		this.branchGuards = undefined;
	}

	get type() {
		return "cjs require";
	}

	get category() {
		return "commonjs";
	}

	/**
	 * Whether this require only evaluates the module (no exports read).
	 * @returns {boolean} true when referencedExports is an empty list
	 */
	isEvaluationOnly() {
		return (
			Array.isArray(this.referencedExports) &&
			this.referencedExports.length === 0
		);
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		const guards = this.branchGuards;
		const evaluationOnly = this.isEvaluationOnly();
		if (guards === undefined && !evaluationOnly) return null;
		return (connection, runtime) => {
			if (
				guards !== undefined &&
				getHarmonyImportGuard().isDeadByGuards(guards, moduleGraph, runtime)
			) {
				return false;
			}
			if (evaluationOnly) {
				const refModule = connection.resolvedModule;
				if (!refModule) return true;
				return refModule.getSideEffectsConnectionState(moduleGraph);
			}
			return true;
		};
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		const importedModule = moduleGraph.getModule(this);
		if (this.isEvaluationOnly()) {
			// Active `require(esm)` with side effects still unwraps `module.exports`.
			if (
				importedModule &&
				isRequireEsmModuleExportsModule(importedModule, moduleGraph)
			) {
				return [{ name: [ESM_MODULE_EXPORTS_NAME], canInline: false }];
			}
			return Dependency.NO_EXPORTS_REFERENCED;
		}
		if (
			importedModule &&
			isRequireEsmModuleExportsModule(importedModule, moduleGraph)
		) {
			// `require(esm)` will unwrap the "module.exports" named export; only
			// that export is observable through this `require()` call.
			return [{ name: [ESM_MODULE_EXPORTS_NAME], canInline: false }];
		}
		if (!this.referencedExports) return Dependency.EXPORTS_OBJECT_REFERENCED;
		const exportsInfo = importedModule
			? moduleGraph.getExportsInfo(importedModule)
			: undefined;
		return this.referencedExports.map((name) => ({
			name: exportsInfo ? trimToProvidedPrefix(exportsInfo, name) : name,
			canMangle: false,
			canInline: false
		}));
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.referencedExports)
			.write(this.valueRange)
			.write(this.branchGuards);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.referencedExports = context.read();
		const c1 = context.rest;
		this.valueRange = c1.read();
		const c2 = c1.rest;
		this.branchGuards = c2.read();
		super.deserialize(c2.rest);
	}
}

CommonJsRequireDependency.Template = class CommonJsRequireDependencyTemplate extends (
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
		{ runtimeTemplate, moduleGraph, chunkGraph, runtime }
	) {
		const dep = /** @type {CommonJsRequireDependency} */ (dependency);
		if (!dep.range) return;
		const connection = moduleGraph.getConnection(dep);
		if (connection && !connection.isTargetActive(runtime)) {
			const guards = dep.branchGuards;
			if (
				guards !== undefined &&
				getHarmonyImportGuard().isDeadByGuards(guards, moduleGraph, runtime)
			) {
				// Dead branch: module is excluded and has no id; code is never executed.
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					"null /* dead branch */"
				);
				return;
			}
			// Unused side-effect-free require: drop the whole call expression.
			if (!dep.valueRange) return;
			source.replace(dep.valueRange[0], dep.valueRange[1] - 1, "0");
			return;
		}
		const importedModule = /** @type {Module} */ (moduleGraph.getModule(dep));
		const content = runtimeTemplate.moduleId({
			module: importedModule,
			chunkGraph,
			request: dep.request,
			weak: dep.weak
		});
		source.replace(dep.range[0], dep.range[1] - 1, content);

		if (dep.valueRange && importedModule) {
			const access = getRequireEsmModuleExportsAccess(
				importedModule,
				moduleGraph,
				runtime
			);
			if (access !== null) {
				source.insert(dep.valueRange[1], access);
			}
		}
	}
};

makeSerializable(
	CommonJsRequireDependency,
	"webpack/lib/dependencies/CommonJsRequireDependency"
);

module.exports = CommonJsRequireDependency;
