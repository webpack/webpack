/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class CssExportDependency extends NullDependency {
	/**
	 * @param {string} name name
	 * @param {string} value value
	 */
	constructor(name, value) {
		super();
		this.name = name;
		this.value = value;
	}

	get type() {
		return "css :export";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const name = this.name;
		return {
			exports: [
				{
					name,
					canMangle: true
				}
			],
			dependencies: undefined
		};
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.name);
		write(this.value);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
		this.value = read();
		super.deserialize(context);
	}
}

CssExportDependency.Template = class CssExportDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { cssExports }) {
		const dep = /** @type {CssExportDependency} */ (dependency);
		cssExports.set(dep.name, dep.value);
	}
};

makeSerializable(
	CssExportDependency,
	"webpack/lib/dependencies/CssExportDependency"
);

module.exports = CssExportDependency;
