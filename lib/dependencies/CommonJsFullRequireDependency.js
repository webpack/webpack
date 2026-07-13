/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

import Template from "../Template.js";
import { equals } from "../util/ArrayHelpers.js";
import { getTrimmedIdsAndRange } from "../util/chainedImports.js";
import makeSerializable from "../util/makeSerializable.js";
import { propertyAccess } from "../util/property.js";
import {
	ESM_MODULE_EXPORTS_NAME,
	getRequireEsmModuleExportsAccess,
	isRequireEsmModuleExportsModule
} from "./CommonJsDependencyHelpers.js";
import ModuleDependency from "./ModuleDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../Dependency.js").ReferencedExports} ReferencedExports */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../ExportsInfo.js").ExportInfoName} ExportInfoName */
/** @typedef {import("../util/runtime.js").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../util/chainedImports.js").IdRanges} IdRanges */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[ExportInfoName[], IdRanges, boolean, undefined | boolean]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[ExportInfoName[], IdRanges, boolean, undefined | boolean]>} ObjectSerializerContext */

class CommonJsFullRequireDependency extends ModuleDependency {
	/**
	 * Creates an instance of CommonJsFullRequireDependency.
	 * @param {string} request the request string
	 * @param {Range} range location in source code
	 * @param {ExportInfoName[]} names accessed properties on module
	 * @param {IdRanges} idRanges ranges for members of ids; the two arrays are right-aligned
	 */
	constructor(request, range, names, idRanges) {
		super(request);
		this.range = range;
		/** @type {string[]} */
		this.names = names;
		/** @type {IdRanges} */
		this.idRanges = idRanges;
		/** @type {boolean} */
		this.call = false;
		/** @type {undefined | boolean} */
		this.asiSafe = undefined;
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
			.write(this.asiSafe);
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
		super.deserialize(c3.rest);
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
		{ runtimeTemplate, moduleGraph, chunkGraph, runtimeRequirements, runtime }
	) {
		const dep = /** @type {CommonJsFullRequireDependency} */ (dependency);
		if (!dep.range) return;
		const importedModule = moduleGraph.getModule(dep);
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

		if (esmRequireAccess !== null) {
			const access = `${esmRequireAccess}${propertyAccess(trimmedIds)}`;
			requireExpr =
				dep.asiSafe === true
					? `(${requireExpr}${access})`
					: `${requireExpr}${access}`;
		} else if (importedModule) {
			// CJS exports are never inlined
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

export default CommonJsFullRequireDependency;

export { CommonJsFullRequireDependency as "module.exports" };
