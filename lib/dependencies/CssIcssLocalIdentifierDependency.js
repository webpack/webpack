/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Ivan Kopeykin @vankop
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const CssIcssExportDependency = require("./CssIcssExportDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").CssDependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../css/CssParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

class CssIcssLocalIdentifierDependency extends CssIcssExportDependency {
	/**
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {string=} prefix prefix
	 */
	constructor(name, range, prefix = "") {
		super(name, name, undefined, range);
		this.prefix = prefix;
		this.interpolationMode = CssIcssExportDependency.INTERPOLATION_MODE.VALUE;
		this.exportMode = CssIcssExportDependency.EXPORT_MODE.ONCE;
	}

	get type() {
		return "css local identifier";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.prefix);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.prefix = read();
		super.deserialize(context);
	}
}

CssIcssLocalIdentifierDependency.Template = CssIcssExportDependency.Template;

makeSerializable(
	CssIcssLocalIdentifierDependency,
	"webpack/lib/dependencies/CssLocalIdentifierDependency"
);

module.exports = CssIcssLocalIdentifierDependency;
