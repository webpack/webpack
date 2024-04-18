/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gengkun He @ahabhgk
*/

"use strict";

const Template = require("../Template");
const makeSerializable = require("../util/makeSerializable");
const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ReferencedExport} ReferencedExport */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../javascript/JavascriptParser").Attributes} Attributes */
/** @typedef {import("../javascript/JavascriptParser").DestructuringAssignmentProperty} DestructuringAssignmentProperty */
/** @typedef {import("../javascript/JavascriptParser").Range} Range */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */

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

class HarmonyDestructuredImportSpecifierDependency extends HarmonyImportSpecifierDependency {
	/**
	 * @param {string} request the request string
	 * @param {number} sourceOrder source order
	 * @param {string[]} ids ids
	 * @param {string} name name
	 * @param {Range} range range
	 * @param {TODO} exportPresenceMode export presence mode
	 * @param {Attributes | undefined} attributes assertions
	 * @param {Range[] | undefined} idRanges ranges for members of ids; the two arrays are right-aligned
	 */
	constructor(
		request,
		sourceOrder,
		ids,
		name,
		range,
		exportPresenceMode,
		attributes,
		idRanges
	) {
		super(
			request,
			sourceOrder,
			ids,
			name,
			range,
			exportPresenceMode,
			attributes,
			idRanges
		);
		/** @type {{ ids: string[], range: Range | undefined, shorthand: boolean | string }[]} */
		this.flattenedProperties = [];
		/** @type {string[][]} */
		this.allIdsInDestructuring = [];
	}

	get type() {
		return "destructured harmony import specifier";
	}

	/**
	 * @param {Set<DestructuringAssignmentProperty>} properties destructuring assignment properties
	 */
	setDestructuringAssignmentProperties(properties) {
		for (const property of properties) {
			const ids = [];
			traversePropertyInDestructuring(
				property,
				({ id, range, shorthand }) => {
					ids.push(id);
					this.flattenedProperties.push({
						ids: [...ids],
						range,
						shorthand
					});
				},
				() => ids.pop(),
				() => this.allIdsInDestructuring.push([...ids])
			);
		}
	}

	/**
	 * @param {string[]=} ids ids
	 * @returns {string[][]} referenced exports
	 */
	_getReferencedExportsInDestructuring(ids) {
		return this.allIdsInDestructuring.map(idsInDestructuring =>
			ids ? ids.concat(idsInDestructuring) : idsInDestructuring
		);
	}

	/**
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.properties);
		write(this.flattenedProperties);
		write(this.allIdsInDestructuring);
		super.serialize(context);
	}

	/**
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.properties = read();
		this.flattenedProperties = read();
		this.allIdsInDestructuring = read();
		super.deserialize(context);
	}
}

HarmonyDestructuredImportSpecifierDependency.Template = class HarmonyDestructuredImportSpecifierDependencyTemplate extends (
	HarmonyImportSpecifierDependency.Template
) {
	/**
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, templateContext) {
		super.apply(dependency, source, templateContext);

		const { moduleGraph, runtime } = templateContext;
		const dep = /** @type {HarmonyDestructuredImportSpecifierDependency} */ (
			dependency
		);
		const { flattenedProperties } = dep;
		for (const {
			ids: idsInDestructuring,
			range,
			shorthand
		} of flattenedProperties) {
			const ids = dep.ids.concat(idsInDestructuring);
			if (ids[0] === "default") ids.shift();
			const module = moduleGraph.getModule(dep);
			const used = moduleGraph.getExportsInfo(module).getUsedName(ids, runtime);
			if (!used) return;
			const newName = used[used.length - 1];
			const name = ids[ids.length - 1];
			if (newName === name) continue;

			const comment = Template.toNormalComment(name) + " ";
			const key = comment + JSON.stringify(newName);
			source.replace(
				range[0],
				range[1] - 1,
				shorthand ? `${key}: ${name}` : `${key}`
			);
		}
	}
};

makeSerializable(
	HarmonyDestructuredImportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyDestructuredImportSpecifierDependency"
);

module.exports = HarmonyDestructuredImportSpecifierDependency;
