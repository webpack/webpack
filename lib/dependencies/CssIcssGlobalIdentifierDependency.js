/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const CssIcssExportDependency = require("./CssIcssExportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../CssModule")} CssModule */
/** @typedef {import("../css/CssGenerator")} CssGenerator */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("../../declarations/WebpackOptions").CssGeneratorExportsConvention} CssGeneratorExportsConvention */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */

class CssIcssGlobalIdentifierDependency extends CssIcssExportDependency {
	/**
	 * @param {string} name export identifier name
	 * @param {string} value identifier value
	 * @param {Range} range the range of dependency
	 */
	constructor(name, value, range) {
		super(name, value, undefined, false);
		this.range = range;
	}

	get type() {
		return "css global identifier";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		return undefined;
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.range);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.range = read();
		super.deserialize(context);
	}
}

CssIcssGlobalIdentifierDependency.Template = CssIcssExportDependency.Template;

makeSerializable(
	CssIcssGlobalIdentifierDependency,
	"webpack/lib/dependencies/CssIcssGlobalDependency"
);

module.exports = CssIcssGlobalIdentifierDependency;
