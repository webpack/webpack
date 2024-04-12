/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gengkun He @ahabhgk
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser").DestructuringAssignmentProperty} DestructuringAssignmentProperty */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./HarmonyImportSpecifierDependency")} HarmonyImportSpecifierDependency */

/**
 * @param {DestructuringAssignmentProperty} property property
 * @param {((property: DestructuringAssignmentProperty) => void) | undefined=} onProperty on property
 * @param {((property: DestructuringAssignmentProperty) => void) | undefined=} onClean on property end
 * @param {(() => void) | undefined=} onTerminate on a terminal property
 */
function traversePropertyInDestructuring(
	property,
	onProperty,
	onClean,
	onTerminate
) {
	onProperty && onProperty(property);
	if (!property.pattern) {
		onTerminate && onTerminate();
	} else {
		for (const p of property.pattern) {
			traversePropertyInDestructuring(p, onProperty, onClean, onTerminate);
		}
	}
	onClean && onClean(property);
}

/**
 * @param {Set<DestructuringAssignmentProperty>} properties properties
 * @returns {string[][]} all ids
 */
function getAllIdsInDestructuring(properties) {
	/** @type {string[][]} */
	const allIds = [];
	for (const p of properties) {
		const ids = [];
		traversePropertyInDestructuring(
			p,
			p => ids.push(p.id),
			p => ids.pop(),
			() => allIds.push([...ids])
		);
	}
	return allIds;
}

class DestructuringAssignmentPropertyKeyDependency extends NullDependency {
	/**
	 * @param {string[]} ids ids
	 * @param {HarmonyImportSpecifierDependency} specifier import specifier
	 * @param {Range} range range of the property key id
	 * @param {boolean | string} shorthand destructuring property is in shorthand
	 */
	constructor(ids, specifier, range, shorthand) {
		super();
		this.ids = ids;
		this.specifier = specifier;
		this.range = range;
		this.shorthand = shorthand;
	}

	get type() {
		return "destructuring assignment property id";
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.ids);
		write(this.specifier);
		write(this.range);
		write(this.shorthand);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.ids = read();
		this.specifier = read();
		this.range = read();
		this.shorthand = read();
		super.deserialize(context);
	}
}

DestructuringAssignmentPropertyKeyDependency.Template = class DestructuringAssignmentPropertyIdDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { moduleGraph, runtime }) {
		const dep = /** @type {DestructuringAssignmentPropertyKeyDependency} */ (
			dependency
		);
		const { ids, specifier, shorthand } = dep;
		const specifierIds = specifier.ids.slice(
			specifier.ids[0] === "default" ? 1 : 0
		);
		const module = moduleGraph.getModule(specifier);
		const used = moduleGraph
			.getExportsInfo(module)
			.getUsedName(specifierIds.concat(ids), runtime);
		if (!used) return;
		const newName = used[used.length - 1];
		const name = ids[ids.length - 1];
		if (newName === name) return;

		source.replace(
			dep.range[0],
			dep.range[1] - 1,
			shorthand
				? `${JSON.stringify(newName)}: ${name}`
				: JSON.stringify(newName)
		);
	}
};

makeSerializable(
	DestructuringAssignmentPropertyKeyDependency,
	"webpack/lib/dependencies/DestructuringAssignmentPropertyKeyDependency"
);

module.exports = DestructuringAssignmentPropertyKeyDependency;
module.exports.traversePropertyInDestructuring =
	traversePropertyInDestructuring;
module.exports.getAllIdsInDestructuring = getAllIdsInDestructuring;
