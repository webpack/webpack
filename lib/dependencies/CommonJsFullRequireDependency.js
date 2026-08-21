/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const Template = require("../Template");
const {
	getDependencyUsedByExportsCondition
} = require("../optimize/InnerGraph");
const { equals } = require("../util/ArrayHelpers");
const { getTrimmedIdsAndRange } = require("../util/chainedImports");
const makeSerializable = require("../util/makeSerializable");
const { propertyAccess } = require("../util/property");
const {
	ESM_MODULE_EXPORTS_NAME,
	getRequireEsmModuleExportsAccess,
	isRequireEsmModuleExportsModule
} = require("./CommonJsDependencyHelpers");
const HarmonyImportGuard = require("./HarmonyImportGuard");
const ModuleDependency = require("./ModuleDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/**
 * @import Dependency, {
 * 	GetConditionFn,
 * 	ReferencedExports,
 * 	ExportInfoName
 * } from "../Dependency"
 */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @import { UsedByExports } from "../optimize/InnerGraph" */
/** @import { RuntimeSpec } from "../util/runtime" */
/** @import { IdRanges } from "../util/chainedImports" */
/** @import { DependencyGuard } from "./HarmonyImportGuard" */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[ExportInfoName[], IdRanges | undefined, boolean, undefined | boolean, DependencyGuard[] | undefined, boolean, boolean, UsedByExports | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[ExportInfoName[], IdRanges | undefined, boolean, undefined | boolean, DependencyGuard[] | undefined, boolean, boolean, UsedByExports | undefined]>} ObjectSerializerContext */

class CommonJsFullRequireDependency extends ModuleDependency {
	/**
	 * Creates an instance of CommonJsFullRequireDependency.
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 * @param {ExportInfoName[]} names accessed properties on module
	 * @param {IdRanges=} idRanges ranges for members of ids; the two arrays are right-aligned
	 */
	constructor(
		request,
		range,
		names,
		idRanges /* TODO webpack 6 make this non-optional. It must always be set to properly trim ids. */
	) {
		super(request);
		this.range = range;
		/** @type {string[]} */
		this.names = names;
		/** @type {IdRanges | undefined} */
		this.idRanges = idRanges;
		/** @type {boolean} */
		this.call = false;
		/** @type {boolean} */
		this.namespaceObjectAsContext = false;
		/** @type {undefined | boolean} */
		this.asiSafe = undefined;
		/** @type {DependencyGuard[] | undefined} */
		this.branchGuards = undefined;
		/** @type {UsedByExports | undefined} */
		this.usedByExports = undefined;
		/** @type {boolean} */
		this._canConcatenate = false;
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		const usedByExportsCondition =
			this.usedByExports !== undefined
				? getDependencyUsedByExportsCondition(this, moduleGraph)
				: null;
		if (usedByExportsCondition === false) return false;
		const guards = this.branchGuards;
		if (usedByExportsCondition === null && guards === undefined) return null;
		return (connection, runtime) => {
			if (
				usedByExportsCondition !== null &&
				usedByExportsCondition(connection, runtime) === false
			) {
				return false;
			}
			return !(
				guards !== undefined &&
				HarmonyImportGuard.isDeadByGuards(guards, moduleGraph, runtime)
			);
		};
	}

	/**
	 * Returns true if this dependency can be concatenated
	 * @param {boolean} concatenateCommonJsModules whether optimization.concatenateModules.commonjs is enabled
	 * @returns {boolean} true if this dependency can be concatenated
	 */
	canConcatenate(concatenateCommonJsModules) {
		return concatenateCommonJsModules && this._canConcatenate;
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		const importedModule = moduleGraph.getModule(this);
		// CommonJS property access is never rewritten to a literal, so it can't inline
		if (
			importedModule &&
			isRequireEsmModuleExportsModule(importedModule, moduleGraph)
		) {
			// When `require(esm)` unwraps a `"module.exports"` named export, the
			// user's property access lands on that value (which webpack does not
			// model), so only the "module.exports" export itself is referenced.
			return [{ name: [ESM_MODULE_EXPORTS_NAME], canInline: false }];
		}
		if (
			this.call &&
			(!importedModule ||
				// the namespace object of a required ESM module is the call receiver
				this.namespaceObjectAsContext ||
				importedModule.getExportsType(moduleGraph, false) !== "namespace")
		) {
			return [{ name: this.names.slice(0, -1), canInline: false }];
		}
		return [{ name: this.names, canInline: false }];
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.names)
			.write(this.idRanges)
			.write(this.call)
			.write(this.asiSafe)
			.write(this.branchGuards)
			.write(this._canConcatenate)
			.write(this.namespaceObjectAsContext)
			.write(this.usedByExports);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.names = context.read();
		const c1 = context.rest;
		this.idRanges = c1.read();
		const c2 = c1.rest;
		this.call = c2.read();
		const c3 = c2.rest;
		this.asiSafe = c3.read();
		const c4 = c3.rest;
		this.branchGuards = c4.read();
		const c5 = c4.rest;
		this._canConcatenate = c5.read();
		const c6 = c5.rest;
		this.namespaceObjectAsContext = c6.read();
		const c7 = c6.rest;
		this.usedByExports = c7.read();
		super.deserialize(c7.rest);
	}

	get type() {
		return "cjs full require";
	}

	get category() {
		return "commonjs";
	}
}

CommonJsFullRequireDependency.Template = class CommonJsFullRequireDependencyTemplate extends (
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
			moduleGraph,
			chunkGraph,
			runtimeRequirements,
			runtime,
			concatenationScope
		}
	) {
		const dep = /** @type {CommonJsFullRequireDependency} */ (dependency);
		if (!dep.range) return;
		const connection = moduleGraph.getConnection(dep);
		// Dead branch: module is excluded and has no id; code is never executed.
		if (connection && !connection.isTargetActive(runtime)) {
			// Replaces the whole member chain, so no property access is left dangling
			source.replace(dep.range[0], dep.range[1] - 1, "null /* dead branch */");
			return;
		}
		const importedModule = moduleGraph.getModule(dep);

		const {
			trimmedRange: [trimmedRangeStart, trimmedRangeEnd],
			trimmedIds
		} = getTrimmedIdsAndRange(
			dep.names,
			dep.range,
			dep.idRanges,
			moduleGraph,
			dep
		);

		if (concatenationScope) {
			const connection = moduleGraph.getConnection(dep);
			if (
				connection &&
				importedModule &&
				concatenationScope.isModuleInScope(importedModule)
			) {
				// `require(esm)` unwraps the "module.exports" export and the member
				// chain hangs off it; without that prefix the ids name exports the
				// module never declares.
				const ids = isRequireEsmModuleExportsModule(
					connection.module,
					moduleGraph
				)
					? [ESM_MODULE_EXPORTS_NAME, ...trimmedIds]
					: trimmedIds;

				source.replace(
					trimmedRangeStart,
					trimmedRangeEnd - 1,
					concatenationScope.createModuleReference(connection.module, {
						ids: ids.length > 0 ? ids : undefined,
						call: dep.call,
						asiSafe: dep.asiSafe,
						moduleExportsAccess: true
					})
				);
				return;
			}
		}

		let requireExpr = runtimeTemplate.moduleExports({
			module: importedModule,
			chunkGraph,
			request: dep.request,
			weak: dep.weak,
			runtimeRequirements
		});

		const esmRequireAccess = importedModule
			? getRequireEsmModuleExportsAccess(importedModule, moduleGraph, runtime)
			: null;

		if (esmRequireAccess !== null) {
			const access = `${esmRequireAccess}${propertyAccess(trimmedIds)}`;
			requireExpr =
				dep.asiSafe === true
					? `(${requireExpr}${access})`
					: `${requireExpr}${access}`;
		} else if (importedModule) {
			// CJS required are never inlined
			const usedImported = /** @type {string | string[] | false} */ (
				moduleGraph
					.getExportsInfo(importedModule)
					.getUsedName(trimmedIds, runtime)
			);
			if (usedImported) {
				const comment = equals(usedImported, trimmedIds)
					? ""
					: `${Template.toNormalComment(propertyAccess(trimmedIds))} `;
				const access = `${comment}${propertyAccess(/** @type {string[]} */ (usedImported))}`;
				requireExpr =
					dep.asiSafe === true
						? `(${requireExpr}${access})`
						: `${requireExpr}${access}`;
			}
		}
		source.replace(trimmedRangeStart, trimmedRangeEnd - 1, requireExpr);
	}
};

makeSerializable(
	CommonJsFullRequireDependency,
	"webpack/lib/dependencies/CommonJsFullRequireDependency"
);

module.exports = CommonJsFullRequireDependency;
