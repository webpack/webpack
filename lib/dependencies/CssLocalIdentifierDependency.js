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
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class CssLocalIdentifierDependency extends NullDependency {
	/**
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {string=} prefix prefix
	 */
	constructor(name, range, prefix = "") {
		super();
		this.name = name;
		this.range = range;
		this.prefix = prefix;
	}

	get type() {
		return "css local identifier";
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
		write(this.range);
		write(this.prefix);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.name = read();
		this.range = read();
		this.prefix = read();
		super.deserialize(context);
	}
}

/**
 * @param {string} str string
 * @param {string | boolean} omitUnderscore true if you need to omit underscore
 * @returns {string} escaped css identifier
 */
const escapeCssIdentifier = (str, omitUnderscore) => {
	const escaped = `${str}`.replace(
		// cspell:word uffff
		/[^a-zA-Z0-9_\u0081-\uffff-]/g,
		s => `\\${s}`
	);
	return !omitUnderscore && /^(?!--)[0-9-]/.test(escaped)
		? `_${escaped}`
		: escaped;
};

CssLocalIdentifierDependency.Template = class CssLocalIdentifierDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{ module, moduleGraph, chunkGraph, runtime, runtimeTemplate, cssExports }
	) {
		const dep = /** @type {CssLocalIdentifierDependency} */ (dependency);
		const used = moduleGraph
			.getExportInfo(module, dep.name)
			.getUsedName(dep.name, runtime);

		if (!used) return;

		const moduleId = chunkGraph.getModuleId(module);
		const identifier =
			dep.prefix +
			(runtimeTemplate.outputOptions.uniqueName
				? runtimeTemplate.outputOptions.uniqueName + "-"
				: "") +
			(used ? moduleId + "-" + used : "-");
		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			escapeCssIdentifier(identifier, dep.prefix)
		);
		if (used) cssExports.set(used, identifier);
	}
};

makeSerializable(
	CssLocalIdentifierDependency,
	"webpack/lib/dependencies/CssLocalIdentifierDependency"
);

module.exports = CssLocalIdentifierDependency;
