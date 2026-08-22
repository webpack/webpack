/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const InitFragment = require("../InitFragment");
const makeSerializable = require("../util/makeSerializable");
const { propertyAccess } = require("../util/property");
const {
	handleDependencyBase,
	isThisBase,
	isWorkerEntryThis
} = require("./CommonJsDependencyHelpers");
const NullDependency = require("./NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/**
 * @import Dependency, {
 * 	ExportsSpec,
 * 	UpdateHashContext,
 * 	ExportInfoName
 * } from "../Dependency"
 */
/** @import Hash from "../util/Hash" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { Range } from "../javascript/JavascriptParser" */
/**
 * @import {
 * 	CommonJSDependencyBaseKeywords
 * } from "./CommonJsDependencyHelpers"
 */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range, Range | null, CommonJSDependencyBaseKeywords, ExportInfoName[]]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Range, Range | null, CommonJSDependencyBaseKeywords, ExportInfoName[]]>} ObjectSerializerContext */

const EMPTY_OBJECT = {};

class CommonJsExportsDependency extends NullDependency {
	/**
	 * Creates an instance of CommonJsExportsDependency.
	 * @param {Range} range range
	 * @param {Range | null} valueRange value range
	 * @param {CommonJSDependencyBaseKeywords} base base
	 * @param {ExportInfoName[]} names names
	 */
	constructor(range, valueRange, base, names) {
		super();
		this.range = range;
		this.valueRange = valueRange;
		/** @type {CommonJSDependencyBaseKeywords} */
		this.base = base;
		/** @type {string[]} */
		this.names = names;
	}

	get type() {
		return "cjs exports";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const name = this.names[0];
		return {
			exports: [
				{
					name,
					// we can't mangle names that are in an empty object
					// because one could access the prototype property
					// when export isn't set yet
					canMangle: !(name in EMPTY_OBJECT)
				}
			],
			dependencies: undefined
		};
	}

	/**
	 * Updates the hash with the data contributed by this instance.
	 * @param {Hash} hash hash to be updated
	 * @param {UpdateHashContext} context context
	 * @returns {void}
	 */
	updateHash(hash, context) {
		// a classic worker entry generates `this` as the global scope, so it must
		// not share one code generation with a runtime that generates it as exports
		if (!isThisBase(this.base)) return;
		const { chunkGraph, runtime, runtimeTemplate } = context;
		const module = chunkGraph.moduleGraph.getParentModule(this);
		hash.update(
			module !== undefined &&
				isWorkerEntryThis(module, chunkGraph, runtime, runtimeTemplate)
				? "worker global"
				: "exports"
		);
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.range)
			.write(this.valueRange)
			.write(this.base)
			.write(this.names);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		const c1 = context.rest;
		this.valueRange = c1.read();
		const c2 = c1.rest;
		this.base = c2.read();
		const c3 = c2.rest;
		this.names = c3.read();
		super.deserialize(c3.rest);
	}
}

makeSerializable(
	CommonJsExportsDependency,
	"webpack/lib/dependencies/CommonJsExportsDependency"
);

CommonJsExportsDependency.Template = class CommonJsExportsDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(
		dependency,
		source,
		{
			module,
			moduleGraph,
			chunkGraph,
			initFragments,
			runtimeRequirements,
			runtime,
			runtimeTemplate
		}
	) {
		const dep = /** @type {CommonJsExportsDependency} */ (dependency);
		// a classic worker entry writes to its global scope, not to an export, so
		// the names stay as written and are never dropped as unused
		const isWorkerEntry =
			isThisBase(dep.base) &&
			isWorkerEntryThis(module, chunkGraph, runtime, runtimeTemplate);
		// CJS exports are never inlined
		const used = isWorkerEntry
			? dep.names
			: /** @type {string | string[] | false} */ (
					moduleGraph.getExportsInfo(module).getUsedName(dep.names, runtime)
				);

		const [type, base] = handleDependencyBase(
			dep.base,
			module,
			runtimeRequirements,
			isWorkerEntry
		);

		switch (type) {
			case "expression":
				if (!used) {
					initFragments.push(
						new InitFragment(
							"var __webpack_unused_export__;\n",
							InitFragment.STAGE_CONSTANTS,
							0,
							"__webpack_unused_export__"
						)
					);
					source.replace(
						dep.range[0],
						dep.range[1] - 1,
						"__webpack_unused_export__"
					);
					return;
				}
				source.replace(
					dep.range[0],
					dep.range[1] - 1,
					`${base}${propertyAccess(/** @type {string[]} */ (used))}`
				);
				return;
			case "Object.defineProperty":
				if (!used) {
					initFragments.push(
						new InitFragment(
							"var __webpack_unused_export__;\n",
							InitFragment.STAGE_CONSTANTS,
							0,
							"__webpack_unused_export__"
						)
					);
					source.replace(
						dep.range[0],
						/** @type {Range} */ (dep.valueRange)[0] - 1,
						"__webpack_unused_export__ = ("
					);
					source.replace(
						/** @type {Range} */ (dep.valueRange)[1],
						dep.range[1] - 1,
						")"
					);
					return;
				}
				source.replace(
					dep.range[0],
					/** @type {Range} */ (dep.valueRange)[0] - 1,
					`Object.defineProperty(${base}${propertyAccess(
						/** @type {string[]} */ (used).slice(0, -1)
					)}, ${JSON.stringify(used[used.length - 1])}, (`
				);
				source.replace(
					/** @type {Range} */ (dep.valueRange)[1],
					dep.range[1] - 1,
					"))"
				);
		}
	}
};

module.exports = CommonJsExportsDependency;
