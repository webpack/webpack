/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Natsu @xiaoxiaojx
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const { propertyName } = require("../util/property");
const NullDependency = require("./NullDependency");

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency, { ExportsSpec, ExportInfoName } from "../Dependency" */
/** @import { DependencyTemplateContext } from "../DependencyTemplate" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import { Range } from "../javascript/JavascriptParser" */
/** @typedef {"keyValue" | "shorthand" | "get" | "set" | "method" | "asyncMethod" | "generatorMethod" | "asyncGeneratorMethod"} CommonJsObjectExportKind */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext<[Range, Range, Range, ExportInfoName, CommonJsObjectExportKind, boolean]>} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext<[Range, Range, Range, ExportInfoName, CommonJsObjectExportKind, boolean]>} ObjectSerializerContext */

const EMPTY_OBJECT = {};

/** @type {ReadonlyMap<CommonJsObjectExportKind, string>} */
const FUNCTION_PROPERTY_DROP_HEAD = new Map([
	["get", "...void (function "],
	["set", "...void (function "],
	["method", "...void (function "],
	["asyncMethod", "...void (async function "],
	["generatorMethod", "...void (function* "],
	["asyncGeneratorMethod", "...void (async function* "]
]);

class CommonJsObjectExportDependency extends NullDependency {
	/**
	 * @param {Range} range property range
	 * @param {Range} keyRange key range
	 * @param {Range} valueRange value / function range
	 * @param {ExportInfoName} name export name
	 * @param {CommonJsObjectExportKind} kind property kind
	 * @param {boolean} pure value is known to be side-effect free
	 */
	constructor(range, keyRange, valueRange, name, kind, pure) {
		super();
		this.range = range;
		this.keyRange = keyRange;
		this.valueRange = valueRange;
		/** @type {ExportInfoName} */
		this.name = name;
		/** @type {CommonJsObjectExportKind} */
		this.kind = kind;
		/** @type {boolean} */
		this.pure = pure;
	}

	get type() {
		return "cjs object exports";
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
					// Keep __esModule stable: the template never renames it.
					canMangle: name !== "__esModule" && !(name in EMPTY_OBJECT)
				}
			],
			dependencies: undefined
		};
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context
			.write(this.range)
			.write(this.keyRange)
			.write(this.valueRange)
			.write(this.name)
			.write(this.kind)
			.write(this.pure);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.range = context.read();
		const c1 = context.rest;
		this.keyRange = c1.read();
		const c2 = c1.rest;
		this.valueRange = c2.read();
		const c3 = c2.rest;
		this.name = c3.read();
		const c4 = c3.rest;
		this.kind = c4.read();
		const c5 = c4.rest;
		this.pure = c5.read();
		super.deserialize(c5.rest);
	}
}

makeSerializable(
	CommonJsObjectExportDependency,
	"webpack/lib/dependencies/CommonJsObjectExportDependency"
);

CommonJsObjectExportDependency.Template = class CommonJsObjectExportDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, moduleGraph, runtime, runtimeTemplate }) {
		const dep = /** @type {CommonJsObjectExportDependency} */ (dependency);
		// Interop marker must stay even when unused.
		if (dep.name === "__esModule") return;
		const used = /** @type {string | false} */ (
			moduleGraph.getExportsInfo(module).getUsedName(dep.name, runtime)
		);
		if (!used) {
			// Object spread rewrite needs environment.spread.
			if (!runtimeTemplate.supportsSpread()) return;
			const range = /** @type {Range} */ (dep.range);
			if (FUNCTION_PROPERTY_DROP_HEAD.has(dep.kind)) {
				// Keep the function body so nested dependency replaces stay valid.
				const valueRange = /** @type {Range} */ (dep.valueRange);
				source.replace(
					range[0],
					valueRange[0] - 1,
					/** @type {string} */ (FUNCTION_PROPERTY_DROP_HEAD.get(dep.kind))
				);
				source.insert(valueRange[1], ")");
				return;
			}
			if (dep.kind === "shorthand") {
				source.replace(range[0], range[1] - 1, `...void (${dep.name})`);
				return;
			}
			// keyValue: keep the value's side effects in place.
			const valueRange = /** @type {Range} */ (dep.valueRange);
			if (dep.pure) {
				// spreading null adds nothing; the text stays so nested replaces hold
				source.replace(
					range[0],
					valueRange[0] - 1,
					"...(/* unused pure expression */ null && ("
				);
				source.replace(valueRange[1], range[1] - 1, "))");
				return;
			}
			source.replace(range[0], valueRange[0] - 1, "...void (");
			source.replace(valueRange[1], range[1] - 1, ")");
			return;
		}
		if (used === dep.name) return;
		// Rename the key to the mangled export name.
		const keyRange = /** @type {Range} */ (dep.keyRange);
		if (dep.kind === "shorthand") {
			source.replace(
				keyRange[0],
				keyRange[1] - 1,
				`${propertyName(used)}: ${dep.name}`
			);
			return;
		}
		source.replace(keyRange[0], keyRange[1] - 1, propertyName(used));
	}
};

CommonJsObjectExportDependency.FUNCTION_PROPERTY_DROP_HEAD =
	FUNCTION_PROPERTY_DROP_HEAD;

module.exports = CommonJsObjectExportDependency;
