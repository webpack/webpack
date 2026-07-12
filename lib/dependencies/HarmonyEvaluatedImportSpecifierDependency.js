/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import { InlinedUsedName } from "../optimize/InlineExports.js";
import { getDependencyUsedByExportsCondition } from "../optimize/InnerGraph.js";
import makeSerializable from "../util/makeSerializable.js";
import { ExportPresenceModes } from "./HarmonyImportDependency.js";
import HarmonyImportSpecifierDependency from "./HarmonyImportSpecifierDependency.js";
import { ImportPhase } from "./ImportPhase.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../Dependency.js").GetConditionFn} GetConditionFn */
/** @typedef {import("../DependencyTemplate.js").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module.js").BuildMeta} BuildMeta */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection.js").default} ModuleGraphConnection */
/** @typedef {import("../javascript/JavascriptParser.js").ImportAttributes} ImportAttributes */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<string[]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<string[]>} ObjectSerializerContext */
/** @typedef {import("./HarmonyImportDependency.js").Ids} Ids */

/**
 * Dependency for static evaluating import specifier. e.g.
 * @example
 * import a from "a";
 * "x" in a;
 * a.x !== undefined; // if x value statically analyzable
 */
class HarmonyEvaluatedImportSpecifierDependency extends HarmonyImportSpecifierDependency {
	/**
	 * Creates an instance of HarmonyEvaluatedImportSpecifierDependency.
	 * @param {string} request the request string
	 * @param {number} sourceOrder source order
	 * @param {Ids} ids ids
	 * @param {string} name name
	 * @param {Range} range location in source code
	 * @param {ImportAttributes | undefined} attributes import assertions
	 * @param {string} operator operator
	 */
	constructor(request, sourceOrder, ids, name, range, attributes, operator) {
		super(
			request,
			sourceOrder,
			ids,
			name,
			range,
			ExportPresenceModes.NONE,
			ImportPhase.Evaluation,
			attributes,
			[]
		);
		/** @type {string} */
		this.operator = operator;
	}

	get type() {
		return `evaluated X ${this.operator} harmony import specifier`;
	}

	/**
	 * Returns function to determine if the connection is active.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {null | false | GetConditionFn} function to determine if the connection is active
	 */
	getCondition(moduleGraph) {
		// Existence check is independent of inlining; skip the base class's
		// inline-sensitivity, which would wrongly deactivate the connection.
		return getDependencyUsedByExportsCondition(this, moduleGraph);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		super.serialize(context);
		const { write } = context;
		write(this.operator);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		super.deserialize(context);
		const { read } = context;
		this.operator = read();
	}
}

makeSerializable(
	HarmonyEvaluatedImportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyEvaluatedImportSpecifierDependency"
);

HarmonyEvaluatedImportSpecifierDependency.Template = class HarmonyEvaluatedImportSpecifierDependencyTemplate extends (
	HarmonyImportSpecifierDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		const dep =
			/** @type {HarmonyEvaluatedImportSpecifierDependency} */
			(dependency);
		const { module, moduleGraph, runtime } = templateContext;
		const connection = moduleGraph.getConnection(dep);
		// Skip rendering depending when dependency is conditional
		if (connection && !connection.isTargetActive(runtime)) return;

		const exportsInfo = moduleGraph.getExportsInfo(
			/** @type {ModuleGraphConnection} */ (connection).module
		);
		const ids = dep.getIds(moduleGraph);

		/** @type {boolean | undefined | null} */
		let value;

		const exportsType =
			/** @type {ModuleGraphConnection} */
			(connection).module.getExportsType(
				moduleGraph,
				/** @type {BuildMeta} */
				(module.buildMeta).strictHarmonyModule
			);
		switch (exportsType) {
			case "default-with-named": {
				if (ids[0] === "default") {
					value =
						ids.length === 1 || exportsInfo.isExportProvided(ids.slice(1));
				} else {
					value = exportsInfo.isExportProvided(ids);
				}
				break;
			}
			case "namespace": {
				value =
					ids[0] === "__esModule"
						? ids.length === 1 || undefined
						: exportsInfo.isExportProvided(ids);
				break;
			}
			case "dynamic": {
				if (ids[0] !== "default") {
					value = exportsInfo.isExportProvided(ids);
				}
				break;
			}
			// default-only could lead to runtime error, when default value is primitive
		}

		if (typeof value === "boolean") {
			source.replace(dep.range[0], dep.range[1] - 1, ` ${value}`);
		} else {
			const usedName = exportsInfo.getUsedName(ids, runtime);

			if (usedName instanceof InlinedUsedName) {
				// Inlined exports only work with ESM export dependency
				// which only existed in modules with `namespace` exportsType.
				throw new Error(
					"Evaluated import specifier dependency has inlined export name: This should not happen"
				);
			}

			const code = this._getCodeForIds(
				dep,
				source,
				templateContext,
				ids.slice(0, -1)
			);
			source.replace(
				dep.range[0],
				dep.range[1] - 1,
				`${
					usedName ? JSON.stringify(usedName[usedName.length - 1]) : '""'
				} in ${code}`
			);
		}
	}
};

export default HarmonyEvaluatedImportSpecifierDependency;

export { HarmonyEvaluatedImportSpecifierDependency as "module.exports" };
