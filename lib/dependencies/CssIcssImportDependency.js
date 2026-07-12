/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

import WebpackError from "../errors/WebpackError.js";
import { cssExportConvention } from "../util/conventions.js";
import makeSerializable from "../util/makeSerializable.js";
import CssImportDependency from "./CssImportDependency.js";
/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency.js").default} Dependency */
/** @typedef {import("../DependencyTemplate.js").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../Module.js").default} Module */
/** @typedef {import("../css/CssGenerator.js").default} CssGenerator */
/** @typedef {import("../css/CssModule.js").default} CssModule */
/** @typedef {import("../ModuleGraph.js").default} ModuleGraph */
/** @typedef {import("../util/runtime.js").RuntimeSpec} RuntimeSpec */
/** @typedef {import("../javascript/JavascriptParser.js").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectDeserializerContext<[string, string]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware.js").ObjectSerializerContext<[string, string]>} ObjectSerializerContext */
/** @typedef {import("../Dependency.js").ReferencedExports} ReferencedExports */
/** @typedef {import("../../declarations/WebpackOptions.js").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("./CssIcssExportDependency.js").ExportMode} ExportMode */
/** @typedef {import("./CssIcssExportDependency.js").ExportType} ExportType */

class CssIcssImportDependency extends CssImportDependency {
	/**
	 * Example of dependency:
	 *
	 * :import('./style.css') { value: name }
	 * @param {string} request request request path which needs resolving
	 * @param {Range} range the range of dependency
	 * @param {"local" | "global"} mode mode of the parsed CSS
	 * @param {string} importName import name (`name` from example)
	 * @param {string} localName local name (`value` from example)
	 */
	constructor(request, range, mode, importName, localName) {
		super(request, range, mode);
		/** @type {string} */
		this.importName = importName;
		/** @type {string} */
		this.localName = localName;
		/** @type {undefined | string[]} */
		this._importNameConventionNames = undefined;
	}

	/**
	 * Memoized `cssExportConvention(this.importName, convention)`. The target
	 * module is fixed for a given dep, so its `exportsConvention` is fixed,
	 * so the convention-derived aliases of `importName` can be cached on the dep.
	 * @param {CssGeneratorExportsConvention} convention convention from the target module's generator
	 * @returns {string[]} convention results
	 */
	getImportNameConventionNames(convention) {
		if (this._importNameConventionNames) {
			return this._importNameConventionNames;
		}
		this._importNameConventionNames = cssExportConvention(
			this.importName,
			convention
		);
		return this._importNameConventionNames;
	}

	get type() {
		return "css :import";
	}

	/**
	 * Returns list of exports referenced by this dependency
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {RuntimeSpec} runtime the runtime for which the module is analysed
	 * @returns {ReferencedExports} referenced exports
	 */
	getReferencedExports(moduleGraph, runtime) {
		return [
			{
				name: [this.importName],
				canMangle: true
			}
		];
	}

	/**
	 * Returns warnings.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {WebpackError[] | null | undefined} warnings
	 */
	getWarnings(moduleGraph) {
		const module = /** @type {CssModule | undefined} */ (
			moduleGraph.getModule(this)
		);

		if (!module) return null;

		// The target module stores exports under the names produced by its
		// `exportsConvention`, so a raw `isExportProvided(this.importName)`
		// would false-positive against `camel-case-only` / `dashes-only` (and
		// any custom function that drops the original spelling). Expand
		// `importName` through the *target* module's convention and accept
		// if any alias is provided.
		const generator =
			/** @type {CssGenerator | undefined} */
			(module.generator);
		const convention =
			generator &&
			/** @type {CssGeneratorExportsConvention | undefined} */
			(generator.options && generator.options.exportsConvention);
		const exportsInfo = moduleGraph.getExportsInfo(module);
		const names = convention
			? this.getImportNameConventionNames(convention)
			: [this.importName];
		const isProvided = names.some((name) => exportsInfo.isExportProvided(name));

		if (!isProvided) {
			const error = new WebpackError(
				`Referenced name "${this.importName}" in "${this.userRequest}" not found`
			);
			error.module = module;

			return [error];
		}

		return null;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.importName).write(this.localName);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.importName = context.read();
		const c1 = context.rest;
		this.localName = c1.read();
		super.deserialize(c1.rest);
	}
}

CssIcssImportDependency.Template = class CssIcssImportDependencyTemplate extends (
	CssImportDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		// Nothing
	}
};

makeSerializable(
	CssIcssImportDependency,
	"webpack/lib/dependencies/CssIcssImportDependency"
);

export default CssIcssImportDependency;

export { CssIcssImportDependency as "module.exports" };
