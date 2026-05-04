/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const memoize = require("../util/memoize");
const HarmonyExportInitFragment = require("./HarmonyExportInitFragment");
const NullDependency = require("./NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Dependency").ExportsSpec} ExportsSpec */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ModuleGraphConnection").ConnectionState} ConnectionState */
/** @typedef {import("../optimize/InlineExports").InlinedValue} InlinedValue */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectDeserializerContext} ObjectDeserializerContext */
/** @typedef {import("../serialization/ObjectMiddleware").ObjectSerializerContext} ObjectSerializerContext */
/** @typedef {import("./HarmonyExportInitFragment").UnusedExports} UnusedExports */
/** @typedef {import("./HarmonyExportInitFragment").ExportMap} ExportMap */

const getInlineExports = memoize(() => require("../optimize/InlineExports"));

class HarmonyExportSpecifierDependency extends NullDependency {
	/**
	 * Creates an instance of HarmonyExportSpecifierDependency.
	 * @param {string} id the id
	 * @param {string} name the name
	 * @param {InlinedValue=} inline inlined primitive value bound to this export
	 */
	constructor(id, name, inline) {
		super();
		this.id = id;
		this.name = name;
		this.inline = inline;
	}

	get type() {
		return "harmony export specifier";
	}

	/**
	 * Returns the exported names
	 * @param {ModuleGraph} moduleGraph module graph
	 * @returns {ExportsSpec | undefined} export names
	 */
	getExports(moduleGraph) {
		const module = moduleGraph.getParentModule(this);
		const pureFunctions =
			module && module.buildInfo && module.buildInfo.pureFunctions;
		const isPure = Boolean(pureFunctions && pureFunctions.has(this.id));
		return {
			exports: [{ name: this.name, isPure, inlined: this.inline }],
			priority: 1,
			terminalBinding: true,
			dependencies: undefined
		};
	}

	/**
	 * Gets module evaluation side effects state.
	 * @param {ModuleGraph} moduleGraph the module graph
	 * @returns {ConnectionState} how this dependency connects the module to referencing modules
	 */
	getModuleEvaluationSideEffectsState(moduleGraph) {
		return false;
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		const { write } = context;
		write(this.id);
		write(this.name);
		write(this.inline);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		const { read } = context;
		this.id = read();
		this.name = read();
		this.inline = read();
		super.deserialize(context);
	}
}

makeSerializable(
	HarmonyExportSpecifierDependency,
	"webpack/lib/dependencies/HarmonyExportSpecifierDependency"
);

HarmonyExportSpecifierDependency.Template = class HarmonyExportSpecifierDependencyTemplate extends (
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
		{ module, moduleGraph, initFragments, runtime, concatenationScope }
	) {
		const dep = /** @type {HarmonyExportSpecifierDependency} */ (dependency);
		if (concatenationScope) {
			concatenationScope.registerExport(dep.name, dep.id);
			return;
		}
		const used = moduleGraph
			.getExportsInfo(module)
			.getUsedName(dep.name, runtime);
		if (!used) {
			/** @type {UnusedExports} */
			const set = new Set();
			set.add(dep.name || "namespace");
			initFragments.push(
				new HarmonyExportInitFragment(module.exportsArgument, undefined, set)
			);
			return;
		}

		const { InlinedUsedName } = getInlineExports();
		if (used instanceof InlinedUsedName) {
			// Inlined: importing side substitutes the literal directly, skip export init
			return;
		}

		/** @type {ExportMap} */
		const map = new Map();
		map.set(used, `/* binding */ ${dep.id}`);
		initFragments.push(
			new HarmonyExportInitFragment(module.exportsArgument, map, undefined)
		);
	}
};

module.exports = HarmonyExportSpecifierDependency;
