/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Burhanuddin Udaipurwala @burhanuday
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

class CSSModuleDefineDependency extends NullDependency {
	/**
	 * @param {string[]} identifierNames array of identifier names
	 * @param {Range} range range
	 * @param {Range[]} identifierRanges array of identifier ranges
	 * @param {string=} prefix prefix
	 */
	constructor(identifierNames, range, identifierRanges, prefix = "") {
		super();
		this.identifierNames = identifierNames;
		this.range = range;
		this.identifierRanges = identifierRanges;
		this.prefix = prefix;
	}

	get type() {
		return "css module definition";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const names = this.identifierNames;
		return {
			exports: names.map(name => {
				return {
					name,
					canMangle: true
				};
			}),
			dependencies: undefined
		};
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.identifierNames);
		write(this.range);
		write(this.identifierRanges);
		write(this.prefix);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.identifierNames = read();
		this.range = read();
		this.identifierRanges = read();
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

CSSModuleDefineDependency.Template = class CSSModuleDefineDependencyTemplate extends (
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
		const dep = /** @type {CSSModuleDefineDependency} */ (dependency);

		// check if all exports are unused
		let isModuleUsed = false;
		for (let i = 0; i < dep.identifierNames.length; i++) {
			const name = dep.identifierNames[i];

			const used = moduleGraph
				.getExportInfo(module, name)
				.getUsedName(name, runtime);

			// should add to output bundle if even one class is used
			if (used) {
				isModuleUsed = true;
				break;
			}
		}

		if (!isModuleUsed) {
			source.replace(dep.range[0], dep.range[1] - 1, "");
			return;
		}

		for (let i = 0; i < dep.identifierNames.length; i++) {
			const name = dep.identifierNames[i];
			const identifierRange = dep.identifierRanges[i];

			const used = moduleGraph
				.getExportInfo(module, name)
				.getUsedName(name, runtime);

			if (!used) {
				source.replace(identifierRange[0] - 1, identifierRange[1] - 1, "");
				continue;
			}

			// create a unique identifier and replace the original class name
			const moduleId = chunkGraph.getModuleId(module);

			const prefix =
				dep.prefix +
				(runtimeTemplate.outputOptions.uniqueName
					? runtimeTemplate.outputOptions.uniqueName + "-"
					: "");

			const uniqueName = moduleId + "-" + used;

			const identifier = prefix + uniqueName;

			const content = escapeCssIdentifier(identifier, dep.prefix);

			source.replace(identifierRange[0], identifierRange[1] - 1, content);
			cssExports.set(used, identifier);
		}
	}
};

makeSerializable(
	CSSModuleDefineDependency,
	"webpack/lib/dependencies/CSSModuleDefineDependency"
);

module.exports = CSSModuleDefineDependency;
