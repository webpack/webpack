/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { cssExportConvention } = require("../util/conventions");
const makeSerializable = require("../util/makeSerializable");
const ModuleDependency = require("./ModuleDependency");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */

class CssIcssComposesGlobalDependency extends NullDependency {
	/**
	 * @param {string} className imported class name
	 * @param {string} exportName local identifier
	 * @param {Range} range the range of dependency
	 */
	constructor(className, exportName, range) {
		super();
		this.className = className;
		this.exportName = exportName;
		this.range = range;
		this._hashUpdate = undefined;
	}

	get type() {
		return "css composes global";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.className);
		write(this.exportName);
		write(this.range);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.className = read();
		this.exportName = read();
		this.range = read();
		super.deserialize(context);
	}
}

CssIcssComposesGlobalDependency.Template = class CssIcssComposesGlobalDependencyTemplate extends (
	ModuleDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		if (templateContext.type !== "javascript") return;
		const { module: m, moduleGraph, runtime, cssData } = templateContext;
		const dep = /** @type {CssIcssComposesGlobalDependency} */ (dependency);

		const module = /** @type {CssModule} */ (m);
		const generator = /** @type {CssGenerator} */ (module.generator);

		const exportNames = cssExportConvention(
			dep.exportName,
			/** @type {CssGeneratorExportsConvention} */
			(generator.convention)
		);
		const exportUsedNames =
			/** @type {string[]} */
			(
				exportNames
					.map((name) =>
						moduleGraph.getExportInfo(module, name).getUsedName(name, runtime)
					)
					.filter(Boolean)
			);

		for (const used of new Set([...exportNames, ...exportUsedNames])) {
			const originalValue = cssData.exports.get(used);

			cssData.exports.set(
				used,
				`${originalValue ? `${originalValue} ` : ""}${dep.className}`
			);
		}
	}
};

makeSerializable(
	CssIcssComposesGlobalDependency,
	"webpack/lib/dependencies/CssIcssComposesGlobalDependency"
);

module.exports = CssIcssComposesGlobalDependency;
